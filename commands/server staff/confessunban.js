const { dbQuery, dbModify, fetchUser } = require("../../coreFunctions");
module.exports = {
	controls: {
		name: "confessunban",
		permission: 2,
		aliases: ["cunban"],
		usage: "confessunban <user>",
		description: "Allows a user to submitting confessions if they are blocked",
		enabled: true,
		permissions: ["VIEW_CHANNEL", "SEND_MESSAGES"],
		cooldown: 5
	},
	do: async (message, client, args) => {
		let user = await fetchUser(args[0], client);
		if (!user) return message.channel.send(":x: Invalid user");
		let qServerDB = await dbQuery("Server", { id: message.guild.id });
		if (!qServerDB.config.blocked.includes(user.id)) return message.channel.send(`:x: **${user.tag}** is not blocked from sending confessions on this server.`, { disableMentions: "everyone" });
		qServerDB.config.blocked.splice(qServerDB.config.blocked.findIndex(r => r === user.id), 1);
		await dbModify("Server", { id: message.guild.id }, qServerDB);
		return message.channel.send(`:white_check_mark: **${user.tag}** (\`${user.id}\`) can now submit confessions on this server.`, {disableMentions: "everyone"});
	}
};
