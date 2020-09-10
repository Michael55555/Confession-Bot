const { dbQuery, dbModify, dbQueryNoNew } = require("../../coreFunctions.js");
module.exports = {
	controls: {
		name: "authorize",
		permission: 10,
		aliases: ["redeem", "premium"],
		usage: "authorize <server id>",
		description: "Adds premium to a server",
		enabled: true,
		permissions: ["VIEW_CHANNEL", "SEND_MESSAGES"]
	},
	do: async (message, client, args) => {
		if (message.guild.id !== "704005798837092473") return message.channel.send(":x: This command is only available in the support server. Use `@Confessions support` for the link.");
		if (!message.member.roles.cache.has("708142308184293487") && !message.member.roles.cache.has("746844013738328144")) return message.channel.send(":x: This command is limited to users with the **Premium** role. You can purchase premium at https://www.patreon.com/confessionsbot");
		let qPremiumDB = await dbQueryNoNew("Server", { premium_rep: message.author.id });
		if (qPremiumDB) return message.channel.send(":x: You have already activated premium for a server! Please contact a global admin to move your premium subscription.");
		if (!args[0]) return message.channel.send(":x: You must specify a server ID!");
		let qServerDB = await dbQuery("Server", { id: args[0] });
		qServerDB.premium = true;
		qServerDB.premium_rep = message.author.id;
		await dbModify("Server", { id: qServerDB.id }, qServerDB);
		return message.channel.send(`:white_check_mark: Activated premium on server with ID \`${qServerDB.id}\``);
	}
};
