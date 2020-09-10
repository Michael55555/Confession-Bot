const { dbQuery, dbModify, fetchUser, dbQueryAll, dbQueryNoNew } = require("../../coreFunctions.js");
const support_invite = "GGm6YuX";
module.exports = {
	controls: {
		name: "admin",
		permission: 1,
		aliases: ["adm"],
		usage: "admin <block|premium|message> <id> (true/false/message)",
		description: "Executes admin functions",
		enabled: true,
		permissions: ["VIEW_CHANNEL", "SEND_MESSAGES"],
		dmAvailable: true
	},
	do: async (message, client, args, Discord) => {
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
		if (!args[0]) return message.channel.send("You must specify `block`, `message`, or `premium`.");
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
				if (![true,false].includes(newValue)) return message.channel.send(`User \`${user.tag}\` is ${qUserDB.blocked ? "" : "not "}blocked globally.`);
				qUserDB.blocked = newValue;
				await dbModify("User", { id: id }, qUserDB);
				if (qUserDB.blocked) {
					let confessions = await dbQueryAll("Confession", { author: id });
					for await (let c of confessions) {
						client.channels.cache.get(c.channel).messages.fetch(c.message).then(m => {
							m.edit(new Discord.MessageEmbed(m.embeds[0])
								.setDescription("*This confession has been reported by the community and deleted by a global moderator.*"));
						}).catch(() => {});
					}
				}
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
		case "message":
		case "warn":
			// eslint-disable-next-line no-case-declarations
			let mid;
			// eslint-disable-next-line no-case-declarations
			let muser = (await fetchUser(args[1], client));
			mid = muser ? muser.id : args[1];
			if (muser) {
				let m = args.splice(2).join(" ");
				if (!m) return message.channel.send(":x: You must specify a message.");
				muser.send(new Discord.MessageEmbed().setAuthor("Global Moderator Message", client.user.displayAvatarURL({ format: "png"})).setDescription(m).setFooter(`If you have any questions please join https://discord.gg/${support_invite} and contact our team`).setColor("RED")).then(() => {
					return message.channel.send(`:white_check_mark: Successfully sent the message to \`${muser.tag}\`.`);
				}).catch(() => {
					return message.channel.send(`:x: Unable to send message to \`${muser.tag}\`.`);
				});
			} else {
				if (!client.guilds.cache.get(mid)) return message.channel.send(":x: Guild not found");
				let qServerDB = await dbQueryNoNew("Server", { id: mid });
				if (!qServerDB.config.channels.confessions) return message.channel.send(":x: This server has no confessions channel set");
				let m = args.splice(2).join(" ");
				if (!m) return message.channel.send(":x: You must specify a message.");
				client.channels.cache.get(qServerDB.config.channels.confessions).send(new Discord.MessageEmbed().setAuthor("Global Moderator Message", client.user.displayAvatarURL({ format: "png"})).setDescription(m).setFooter(`If you have any questions please join https://discord.gg/${support_invite} and contact our team`).setColor("RED")).then(() => {
					return message.channel.send(`:white_check_mark: Successfully sent the message guild \`${mid}\`.`);
				}).catch(() => {
					return message.channel.send(`:x: Unable to send message to \`${mid}\`.`);
				});
			}
			break;
		case "premium":
			// eslint-disable-next-line no-case-declarations
			let guildId = args[1];
			// eslint-disable-next-line no-case-declarations
			let qServerDB = await dbQuery("Server", { id: guildId });
			// eslint-disable-next-line no-case-declarations
			let newValue = handleTrueFalse(args[2]);
			if (![true, false].includes(newValue)) return message.channel.send(`Guild with ID \`${guildId}\` ${qServerDB.premium ? "has" : "does not have"} premium features.`);
			qServerDB.premium = newValue;
			if (newValue === false) qServerDB.premium_rep = null;
			await dbModify("Server", { id: guildId }, qServerDB);
			return message.channel.send(`:white_check_mark: Guild with ID \`${guildId}\` now ${qServerDB.premium ? "has" : "does not have"} access to premium features.`);
		}
	}
};
