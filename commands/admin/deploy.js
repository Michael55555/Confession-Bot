const exec = (require("util").promisify((require("child_process").exec)));
module.exports = {
	controls: {
		name: "deploy",
		permission: 0,
		usage: "deploy",
		description: "Updates the bot",
		enabled: true,
		permissions: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS", "USE_EXTERNAL_EMOJIS"],
		dmAvailable: true
	},
	do: async (message, client, args, Discord) => {
		if (process.env.NODE_ENV !== "production" && args[0] !== "-f") return message.channel.send(`:x: I am not running in the production environment. You probably don't want to deploy now.`); // Don't deploy if the bot isn't running in the production environment
		let m = await message.channel.send("Loading...");
		console.log("📥 Deploy initiated");
		await generateEmbed("Deploy command received");
		await generateEmbed("Updating code");

		let branch = "master";
		if (args[0]) branch = args[0];

		exec(`git fetch origin && git reset --hard origin/${branch}`) // Pull new code from GitHub
			.then(async () => {
				await generateEmbed("Removing old node modules");
				return exec("rm -rf node_modules/"); // Delete old node_modules
			})
			.then(async () => {
				await generateEmbed("Installing new NPM packages");
				return exec("npm i --production"); // Installing any new dependencies
			})
			.then(async () => {
				await generateEmbed("Shutting down");
				return client.shard.respawnAll(); // Stop the bot
			});

		/**
		 * Use an embed for deploy command logs
		 * @param {string} msg - The message to be logged
		 * @returns {Promise<void>}
		 */
		async function generateEmbed(msg) {
			if (typeof generateEmbed.message == "undefined") generateEmbed.message = [];
			generateEmbed.message.push(`- ${msg}`);
			let embed = new Discord.MessageEmbed()
				.setDescription(`\`\`\`md\n${generateEmbed.message.join("\n")}\`\`\``)
				.setColor("RANDOM");
			console.log(msg);
			if (m) await m.edit({content: "", embed: embed});
		}
	}
};
