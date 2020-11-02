const { dbQuery, dbModify, fetchUser, dbQueryAll, dbQueryNoNew, checkPermissions } = require("../../coreFunctions.js");
const { reports_channel, gmod_channel, global_mod } = require("../../config");
const support_invite = "GGm6YuX";
module.exports = {
	controls: {
		name: "admin",
		permission: 2,
		aliases: ["adm"],
		usage: "admin <block|premium|message> <id> (true/false/message)",
		description: "Executes admin functions",
		enabled: true,
		permissions: ["VIEW_CHANNEL", "SEND_MESSAGES"],
		dmAvailable: true
	},
	do: async (message, client, args, Discord) => {
		const permission = await checkPermissions(message.member || message.author, client);
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
		if (!args[0]) return message.channel.send("You must specify `block`, `message`, `delete`, or `premium`.");
		switch (args[0].toLowerCase()) {
		case "flag":
			if (message.channel.id !== reports_channel) return message.channel.send(":x: This command can only be run in the reports channel");
			if (!args[0]) return message.channel.send(":x: You must specify a message ID");
			// eslint-disable-next-line no-case-declarations
			let m = await message.channel.messages.fetch(args[1]).catch(() => false);
			if (!m) return message.channel.send(":x: Message not found");
			client.channels.cache.get(gmod_channel).send(`<@&${global_mod}>`, new Discord.MessageEmbed(m.embeds[0]));
			return message.react("✅");
		case "block":
			if (permission > 1) return;
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
				let m;
				if (qUserDB.blocked) {
					let confessions = await dbQueryAll("Confession", { author: id });
					m = await message.channel.send(`Beginning to remove this user's confessions... there are ${confessions.length} of them to delete`);
					for await (let c of confessions) {
						await client.shard.broadcastEval(`
						if (this.channels.cache.get("${c.channel}")) this.channels.cache.get("${c.channel}").messages.fetch("${c.message}").then(m => {
							let Discord = require("discord.js");
							m.edit(new Discord.MessageEmbed(m.embeds[0])
								.setDescription("*This confession has been reported by the community and deleted by a global moderator.*")
								.setFooter(""));
						}).catch(() => {});
						`);
					}
					user.send(new Discord.MessageEmbed().setAuthor("Global Moderator Message", client.user.displayAvatarURL({ format: "png"})).setDescription("You have been blocked from using the Confessions bot globally.").setFooter(`If you have any questions please join https://discord.gg/${support_invite} and contact our team`).setColor("RED")).catch(() => {});
				}
				if (m) return m.edit(`:white_check_mark: User \`${user.tag}\` is now ${qUserDB.blocked ? "" : "not "}blocked globally.`);
				else return message.channel.send(`:white_check_mark: User \`${user.tag}\` is now ${qUserDB.blocked ? "" : "not "}blocked globally.`);
			} else {
				let qServerDB = await dbQuery("Server", { id: id });
				let newValue = handleTrueFalse(args[2]);
				if (![true, false].includes(newValue)) return message.channel.send(`Guild with ID \`${id}\` is ${qServerDB.blocked ? "" : "not "}blocked from using the bot.`);
				qServerDB.blocked = newValue;
				if (qServerDB.blocked && client.guilds.cache.get(id)) client.guilds.cache.get(id).leave();
				await client.shard.broadcastEval(`if (this.guilds.cache.get(${id})) this.guilds.cache.get(${id}).leave();`);
				await dbModify("Server", { id: id }, qServerDB);
				return message.channel.send(`:white_check_mark: Guild with ID \`${id}\` is now ${qServerDB.blocked ? "" : "not "}blocked from using the bot.`);
			}
		case "message":
		case "warn":
			if (permission > 1) return;
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
				let g = await client.shard.broadcastEval(`this.guilds.cache.get(${mid})`);
				let gShard = g.findIndex(a => a);
				if (!gShard) return message.channel.send(":x: Guild not found");
				let qServerDB = await dbQueryNoNew("Server", { id: mid });
				if (!qServerDB.config.channels.confessions) return message.channel.send(":x: This server has no confessions channel set");
				let m = args.splice(2).join(" ");
				if (!m) return message.channel.send(":x: You must specify a message.");
				let e = new Discord.MessageEmbed().setAuthor("Global Moderator Message", client.user.displayAvatarURL({ format: "png"})).setDescription(m).setFooter(`If you have any questions please join https://discord.gg/${support_invite} and contact our team`).setColor("RED");
				let sent = await client.shard.broadcastEval(`
				if (this.channels.cache.get("${qServerDB.config.channels.confessions}")) this.channels.cache.get("${qServerDB.config.channels.confessions}").send({ embed: ${JSON.stringify(e)} }).then(() => true).catch(() => false);`);
				if (sent) return message.channel.send(`:white_check_mark: Successfully sent the message to guild \`${mid}\`.`);
				else return message.channel.send(`:x: Unable to send message to \`${mid}\`.`);

			}
			break;
		case "delete":
		case "remove":
			if (permission > 1) return;
			if (!args[1] || !args[2]) return message.channel.send(":x: You must specify a channel and message ID");
			// eslint-disable-next-line no-case-declarations
			let c = await dbQueryNoNew("Confession", { channel: args[1], message: args[2] });
			if (!c) return message.channel.send(":x: No confession found");
			await client.shard.broadcastEval(`
						if (this.channels.cache.get("${c.channel}")) this.channels.cache.get("${c.channel}").messages.fetch("${c.message}").then(m => {
							let Discord = require("discord.js");
							m.edit(new Discord.MessageEmbed(m.embeds[0])
								.setDescription("*This confession has been reported by the community and deleted by a global moderator.*")
								.setFooter(""));
						}).catch(() => {});
						`);
			return message.channel.send(":white_check_mark: Confession removed");
		case "premium":
			if (permission > 1) return;
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
