const { dbQuery, fetchUser } = require("../../coreFunctions");
module.exports = {
	controls: {
		name: "confessban",
		permission: 2,
		aliases: ["cbanlist", "cbl", "banlist"],
		usage: "confessbanlist",
		description: "Shows the list of blocked users",
		enabled: true,
		permissions: ["VIEW_CHANNEL", "SEND_MESSAGES"],
		cooldown: 5
	},
	do: async (message, client, args, Discord) => {
		let qServerDB = await dbQuery("Server", { id: message.guild.id });
		if (qServerDB.config.blocked.length === 0) return message.channel.send("No users are blocked from submitting confessions on this server.");
		let blockList = [];
		for await (const u of qServerDB.config.blocked) {
			let user = await fetchUser(u, client);
			blockList.push(`${user.tag} (${user.id})`);
		}
		let embed = new Discord.MessageEmbed()
			.setTitle("Blocked User List")
			.setColor("RANDOM")
			.setDescription(blockList.join("\n"));
		message.channel.send(embed);
	}
};
