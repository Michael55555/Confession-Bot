const { dbQuery, dbModify, channelPermissions } = require("../../coreFunctions");
const { findBestMatch } = require("string-similarity");
module.exports = {
	controls: {
		name: "config",
		permission: 1,
		aliases: ["cfg"],
		usage: "config <element> (setting)",
		description: "Configures various aspects of the bot",
		enabled: true,
		permissions: ["VIEW_CHANNEL", "SEND_MESSAGES"],
		cooldown: 5
	},
	do: async (message, client, args, Discord) => {
		function nearMatchCollection (collection, words) {
			let array = collection.array();
			let nameArray = array.map((r) => r.name.toLowerCase());

			let { bestMatchIndex, bestMatch: { rating } } = findBestMatch(words.toLowerCase(), nameArray);

			if (rating < .3) return null;
			return array[bestMatchIndex];
		}
		async function findChannel(input, channels) {
			if (!input) return null;
			let foundId;
			let matches = input.match(/^<#(\d+)>$/);
			if (!matches) {
				let channelFromNonMention = channels.find(channel => channel.name.toLowerCase() === input.toLowerCase()) || channels.get(input) || null;
				if (channelFromNonMention) foundId = channelFromNonMention.id;
				else {
					let nearMatch = nearMatchCollection(channels, input);
					if (nearMatch) return nearMatch;
				}
			} else foundId = matches[1];

			return channels.get(foundId) || null;
		}
		async function handleChannelInput (input, server, current_name, chname, reset) {
			if (!input) return ":x: You must specify a channel name, #mention, or ID!";
			if (reset && (input === "none" || input === "reset")) {
				qServerDB.config.channels[current_name] = "";
				await dbModify("Server", {id: server.id}, qServerDB);
				return `:white_check_mark: Successfully reset the ${chname}.`;
			}
			let channel = await findChannel(input, server.channels.cache);
			if (!channel || channel.type !== "text") return ":x: No text channel could be found based on your input! Please specify a valid channel name, #mention, or ID!";
			let permissions = await channelPermissions("viewsendembed", channel, client);
			if (permissions) return permissions;
			qServerDB.config.channels[current_name] = channel.id;
			await dbModify("Server", {id: server.id}, qServerDB);
			return `:white_check_mark: Successfully set the ${chname} to <#${channel.id}>`;
		}
		async function showChannel (channel, server, title) {
			let foundChannel = server.channels.cache.get(channel);
			if (!foundChannel || foundChannel.type !== "text") {
				return [`:x: **${title}:** None Configured`, true];
			}
			return [`:white_check_mark: **${title}:** <#${foundChannel.id}> (${foundChannel.id})`];
		}

		let qServerDB = await dbQuery("Server", { id: message.guild.id });

		if (!args[0]) {
			let embed = new Discord.MessageEmbed()
				.setTitle("Bot Settings")
				.addField("Confessions Channel", `${(await showChannel(qServerDB.config.channels.confessions, message.guild, "Current Configuration"))[0]}\nConfigure using \`${qServerDB.config.prefix}config confessions #channel\``)
				.addField("Log Channel (Premium)", `${(await showChannel(qServerDB.config.channels.logs, message.guild, "Current Configuration"))[0]}\nConfigure using \`${qServerDB.config.prefix}config logs #channel\``)
				.addField("Prefix", `${Discord.escapeMarkdown(qServerDB.config.prefix)}\nConfigure using \`${qServerDB.config.prefix}config prefix ?\``)
				.setColor("PINK");
			return message.channel.send(embed);
		}
		switch (args[0].toLowerCase()) {
		case "confessions":
		case "confession":
		case "confessionslog":
		case "confessionlog":
		case "confess":
			if (!args[1]) return message.channel.send((await showChannel(qServerDB.config.channels.confessions, message.guild, "Confessions Channel"))[0]);
			return message.channel.send((await handleChannelInput(args[1], message.guild, "confessions", "confessions channel")));
		case "log":
		case "logs":
		case "logchannel":
		case "logschannel":
			if (!qServerDB.premium) return message.channel.send(":x: Configuring a log channel is limited to __premium__ users. Get premium at https://www.patreon.com/confessionsbot");
			if (!args[1]) return message.channel.send((await showChannel(qServerDB.config.channels.logs, message.guild, "Confession Log Channel"))[0]);
			return message.channel.send((await handleChannelInput(args[1], message.guild, "logs", "confession log channel", true)));
		case "prefix":
			if (!args[1]) return message.channel.send(`**Prefix:** ${Discord.escapeMarkdown(qServerDB.config.prefix)}`);
			// eslint-disable-next-line no-case-declarations
			let prefix = args[1];
			if (prefix.length > 20) return message.channel.send(":x: Prefixes are limited to a length of 20 characters.");
			// eslint-disable-next-line no-case-declarations
			let disallowed = ["confess:", `${client.user.id}:`];
			if (disallowed.includes(prefix.toLowerCase())) return message.channel.send(":x: This prefix is disallowed, please choose a different one.");
			qServerDB.config.prefix = prefix.toLowerCase();
			await dbModify("Server", {id: message.guild.id}, qServerDB);
			return message.channel.send(`:white_check_mark: The prefix is now ${Discord.escapeMarkdown(qServerDB.config.prefix)}`);
		default:
			return message.channel.send(":x: That is an invalid configuration element. Valid elements are `confessions`, `log`, and `prefix`.");
		}
	}
};