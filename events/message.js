const { dbQuery, checkPermissions, errorLog, channelPermissions } = require("../coreFunctions");
const { prefix: defaultPrefix, log_hooks } = require("../config.json");

function escapeRegExp(string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

module.exports = async (Discord, client, message) => {
	function commandLog (msg, content) {
		(new Discord.WebhookClient(log_hooks.commands.id, log_hooks.commands.token)).send(msg, (new Discord.MessageEmbed()).setDescription(content));
	}

	if (!["text", "news", "dm"].includes(message.channel.type) || message.author.bot) return;

	const permission = await checkPermissions(message.member || message.author, client);

	let args = message.content.split(" ");

	let serverPrefix = defaultPrefix;
	if (message.guild) {
		let qServerDB = await dbQuery("Server", { id: message.guild.id });
		serverPrefix = qServerDB.config.prefix;
	}
	const match = message.content.match(new RegExp(`^(${escapeRegExp(serverPrefix)}|<@!?${client.user.id}> ?${!message.guild ? "|" : ""})(\\S+)`));
	if (!match) return;

	if (match[1].endsWith(" ")) args = args.splice(1);
	if (args[0].includes("\n")) {
		args.splice(0, 1, ...args[0].split("\n"));
	}

	args.splice(0, 1);

	let command = client.commands.find((c) => c.controls.name.toLowerCase() === match[2].toLowerCase() || c.controls.aliases && c.controls.aliases.includes(match[2].toLowerCase()));
	if (!command) return;

	if (command.controls.enabled === false) {
		commandLog(`:x: **${message.author.tag}** (\`${message.author.id}\`) attempted to use disabled command \`${command.controls.name}\` in the **#${message.channel.name}** (\`${message.channel.id}\`) channel of **${message.guild.name}** (\`${message.guild.id}\`)`, message.content);
		return message.channel.send(":x: This command is currently disabled globally.");
	}

	if (!message.guild && !command.controls.dmAvailable) return message.channel.send(":x: This command can only be used in a server.");

	if (permission > command.controls.permission) return commandLog(`:no_entry_sign: **${message.author.tag}** (\`${message.author.id}\`) attempted to use command \`${command.controls.name}\` in ${message.guild ? `the **#${message.channel.name}** (\`${message.channel.id}\`) channel of **${message.guild.name}** (\`${message.guild.id}\`)` : "DMs"} but did not have permission to do so`, message.content);

	if (command.controls.permissions && message.guild) {
		let permissions = await channelPermissions(command.controls.permissions, message.channel, client);
		if (permissions) return permissions;
	}

	try {
		commandLog(`:wrench: **${message.author.tag}** (\`${message.author.id}\`) used command \`${command.controls.name}\` in ${message.guild ? `the **#${message.channel.name}** (\`${message.channel.id}\`) channel of **${message.guild.name}** (\`${message.guild.id}\`)` : "DMs"}`, message.content);
		return command.do(message, client, args, Discord);
	} catch (err) {
		message.channel.send(":x: Something went wrong with that command, please try again later.");
		errorLog(err, "Command Handler", `Message Content: ${message.content}`);
	}
};
