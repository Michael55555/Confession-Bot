const { dbQuery, checkPermissions, errorLog, channelPermissions } = require("../coreFunctions");
const { prefix: defaultPrefix, log_hooks } = require("../config.json");

module.exports = async (Discord, client, message) => {
	function commandLog (msg, content) {
		(new Discord.WebhookClient(log_hooks.commands.id, log_hooks.commands.token)).send(msg, (new Discord.MessageEmbed()).setDescription(content));
	}

	if (message.author.bot === true || message.channel.type !== "text") return;

	const permission = await checkPermissions(message.member, client);

	let qServerDB = await dbQuery("Server", { id: message.guild.id });
	let serverPrefix = (qServerDB && qServerDB.config && qServerDB.config.prefix) || defaultPrefix;

	let regexEscape = "^$.|?*+()[{".split("");
	regexEscape.push("\\");

	const match = message.content.match(new RegExp(`^<@!?${client.user.id}> ?`));
	let specialPrefix = false;
	if (match) {
		serverPrefix = match[0];
		specialPrefix = true;
	}
	else if (permission <= 1 && message.content.toLowerCase().startsWith("confess:")) {
		serverPrefix = "confess:";
		specialPrefix = true;
	}
	else if (permission <= 1 && message.content.toLowerCase().startsWith(`${client.user.id}:`)) {
		serverPrefix = `${client.user.id}:`;
		specialPrefix = true;
	}

	if (!message.content.toLowerCase().startsWith(serverPrefix)) return;
	let args = message.content.split(" ");
	serverPrefix.endsWith(" ") ? args = args.splice(2) : args = args.splice(1);

	if (!specialPrefix) {
		let splitPrefix = serverPrefix.split("");
		for (let i = 0; i < splitPrefix.length; i++) {
			if (regexEscape.includes(splitPrefix[i])) splitPrefix[i] = "\\" + splitPrefix[i];
		}
		serverPrefix = splitPrefix.join("");
	}
	let commandName = message.content.toLowerCase().match(new RegExp(`^${serverPrefix}([a-z]+)`));

	if (!commandName || !commandName[1]) return;
	else commandName = commandName[1];

	const command = client.commands.find((c) => c.controls.name.toLowerCase() === commandName || c.controls.aliases && c.controls.aliases.includes(commandName));
	if (!command) return;

	if (command.controls.enabled === false) {
		commandLog(`:x: **${message.author.tag}** (\`${message.author.id}\`) attempted to use disabled command \`${command.controls.name}\` in the **#${message.channel.name}** (\`${message.channel.id}\`) channel of **${message.guild.name}** (\`${message.guild.id}\`)`, message.content);
		return message.channel.send(":x: This command is currently disabled globally.");
	}

	if (permission > command.controls.permission) return commandLog(`:no_entry_sign: **${message.author.tag}** (\`${message.author.id}\`) attempted to use command \`${command.controls.name}\` in the **#${message.channel.name}** (\`${message.channel.id}\`) channel of **${message.guild.name}** (\`${message.guild.id}\`) but did not have permission to do so`, message.content);;

	if (command.controls.permissions) {
		let permissions = await channelPermissions(command.controls.permissions, message.channel, client);
		if (permissions) return permissions;
	}

	try {
		commandLog(`:wrench: **${message.author.tag}** (\`${message.author.id}\`) used command \`${command.controls.name}\` in the **#${message.channel.name}** (\`${message.channel.id}\`) channel of **${message.guild.name}** (\`${message.guild.id}\`)`, message.content);
		return command.do(message, client, args, Discord);
	} catch (err) {
		message.channel.send(":x: Something went wrong with that command, please try again later.");
		errorLog(err, "Command Handler", `Message Content: ${message.content}`);
	}
};
