const { dbQuery, dbModify, fetchUser } = require("../../coreFunctions");
module.exports = {
	controls: {
		name: "confessban",
		permission: 1,
		aliases: ["cban"],
		usage: "confessban <user>",
		description: "Disallows a user from submitting a confession",
		enabled: true,
		permissions: ["VIEW_CHANNEL", "SEND_MESSAGES"],
		cooldown: 5
	},
	do: async (message, client, args) => {
		let user = await fetchUser(args[0], client);
		if (!user) return message.channel.send(":x: Invalid user");
		let qServerDB = await dbQuery("Server", { id: message.guild.id });
		if (qServerDB.config.blocked.includes(user.id)) return message.channel.send(`:x: **${user.tag}** is already blocked from sending confessions.`, { disableMentions: "everyone" });
		qServerDB.config.blocked.push(user.id);
		await dbModify("Server", { id: message.guild.id }, qServerDB);
		return message.channel.send(`:white_check_mark: Blacklisted **${user.tag}** (\`${user.id}\`) from submitting confessions on this server.`, {disableMentions: "everyone"});
	}
};