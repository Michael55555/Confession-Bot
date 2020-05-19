const { dbQuery, dbModify, fetchUser } = require("../../coreFunctions.js");
module.exports = {
	controls: {
		name: "admin",
		permission: 0,
		aliases: ["adm"],
		usage: "admin <block|premium> <id> (true/false)",
		description: "Executes admin functions",
		enabled: true,
		permissions: ["VIEW_CHANNEL", "SEND_MESSAGES"]
	},
	do: async (message, client, args) => {
		function handleTrueFalse (input) {
			switch (input) {
			case "true":
				return true;
			case "false":
				return false;
			default:
				return null;
			}
		}
		switch (args[0].toLowerCase()) {
		case "block":
			// eslint-disable-next-line no-case-declarations
			let id;
			// eslint-disable-next-line no-case-declarations
			let user = (await fetchUser(args[1], client));
			id = user ? user.id : args[1];
			if (user) {
				let qUserDB = await dbQuery("User", { id: id });
				let newValue = handleTrueFalse(args[2]);
				if (!newValue) return message.channel.send(`User \`${user.tag}\` is ${qUserDB.blocked ? "" : "not "}blocked globally.`);
				qUserDB.blocked = newValue;
				await dbModify("User", { id: id }, qUserDB);
				return message.channel.send(`:white_check_mark: User \`${user.tag}\` is now ${qUserDB.blocked ? "" : "not "}blocked globally.`);
			} else {
				let qServerDB = await dbQuery("Server", { id: id });
				let newValue = handleTrueFalse(args[2]);
				if (![true, false].includes(newValue)) return message.channel.send(`Guild with ID \`${id}\` is ${qServerDB.blocked ? "" : "not "}blocked from using the bot.`);
				qServerDB.blocked = newValue;
				if (qServerDB.blocked && client.guilds.cache.get(id)) client.guilds.cache.get(id).leave();
				await dbModify("Server", { id: id }, qServerDB);
				return message.channel.send(`:white_check_mark: Guild with ID \`${id}\` is now ${qServerDB.blocked ? "" : "not "}blocked from using the bot.`);
			}
		case "premium":
			// eslint-disable-next-line no-case-declarations
			let guildId = args[1];
			// eslint-disable-next-line no-case-declarations
			let qServerDB = await dbQuery("Server", { id: guildId });
			// eslint-disable-next-line no-case-declarations
			let newValue = handleTrueFalse(args[2]);
			if (![true, false].includes(newValue)) return message.channel.send(`Guild with ID \`${guildId}\` ${qServerDB.premium ? "has" : "does not have"} premium features.`);
			qServerDB.premium = newValue;
			await dbModify("Server", { id: guildId }, qServerDB);
			return message.channel.send(`:white_check_mark: Guild with ID \`${guildId}\` now ${qServerDB.premium ? "has" : "does not have"} access to premium features.`);
		}
	}
};