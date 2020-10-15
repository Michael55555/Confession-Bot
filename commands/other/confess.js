const { dbQuery } = require("../../coreFunctions");
const { Confession } = require("../../utils/schemas");
module.exports = {
	controls: {
		name: "confess",
		permission: 10,
		aliases: ["confession"],
		usage: "confess",
		description: "Enters the prompt to submit a confession in DMs",
		enabled: true,
		permissions: ["VIEW_CHANNEL", "SEND_MESSAGES", "MANAGE_MESSAGES"],
		dmAvailable: true
	},
	do: async (message, client, args, Discord) => {
		if (message.guild) {
			message.delete();
			return message.reply("To submit a confession, please DM this bot `confess`").then(m => setTimeout(function() {
				m.delete();
			}, 5000));
		}
		let allGuilds = await client.shard.broadcastEval(`this.guilds.cache.filter(g => g.members.cache.get("${message.author.id}")).array();`);
		let guilds = allGuilds.reduce((p, c) => p.concat(c), []);
		let choiceEmbed = new Discord.MessageEmbed()
			.setTitle("Server Select")
			.setColor("RANDOM")
			.setDescription("Send the number of the server you'd like to send your confession to. If you don't see a server that has the bot here, try sending a message in the server and running `confess` again!");
		let guildNum = 1;
		if (guilds.length === 0) choiceEmbed.addField("No Servers Found", "See the instructions above");
		else choiceEmbed.setFooter("You have 1 minute to select a server - send \"cancel\" to cancel");
		guilds.forEach(g => {
			g.num = guildNum;
			choiceEmbed.addField(`${guildNum} - ${g.name}`, "​");
			guildNum++;
		});
		let m = await message.channel.send(choiceEmbed);
		if (guilds.length === 0) return;
		m.channel.awaitMessages(response => response.author.id === message.author.id, {
			max: 1,
			time: 60000,
			errors: ["time"],
		}).then(async (collected) => {
			if (!collected.first().content.split(" ")[0]) return;
			if (collected.first().content.toLowerCase() === "cancel") return m.channel.send(":+1: Cancelled");
			let num = collected.first().content.split(" ")[0];
			if (parseInt(num) && guilds.find(g => g.num === parseInt(num))) {
				let guild = guilds.find(g => g.num === parseInt(num));
				let qServerDB = await dbQuery("Server", { id: guild.id });
				if (!qServerDB.config.channels.confessions) return message.channel.send(`:x: **${guild.name}** has no confessions channel configured!`);
				if (qServerDB.config.blocked.includes(message.author.id)) return message.channel.send(`:x: You are blocked from submitting confessions on **${guild.name}**.`);
				let embed = new Discord.MessageEmbed()
					.setTitle(`Confession: ${guild.name}`)
					.setDescription(`What would you like to confess? Reply to this message to submit your confession.\n\nYour confession will be __anonymously__ posted to <#${qServerDB.config.channels.confessions}> as soon as you reply.${qServerDB.config.channels.logs ? "\n> **Note:** Your confession will be logged in a private staff channel with your user information for moderation purposes." : ""}`)
					.setFooter("You have 1 minute to respond - type \"cancel\" to abort");
				message.channel.send(embed).then(sent => {
					sent.channel.awaitMessages(response => response.author.id === message.author.id, {
						max: 1,
						time: 60000,
						errors: ["time"],
					}).then(async (collected) => {
						if (!collected.first().content.split(" ")[0]) return;
						if (collected.first().content.toLowerCase() === "cancel") return sent.channel.send(":+1: Cancelled");
						let confessEmbed = new Discord.MessageEmbed()
							.setTitle("Anonymous Confession")
							.setDescription(`"${collected.first().content}"`)
							.setColor("RANDOM")
							.setTimestamp();
						confessEmbed.footer = { text: "" };
						let c = await client.shard.broadcastEval(`
						if (this.guilds.cache.get("${guild.id}")) {
							let embed = ${JSON.stringify(confessEmbed)};
							this.channels.cache.get("${qServerDB.config.channels.confessions}").send({ embed }).then(c => {
							embed.footer.text = \`If this confession is ToS-breaking or overtly hateful, you can report it using "?report \${c.id}"\`;
							console.log(embed);
							c.edit({ embed });
							embed.fields.push({
								name: "User",
								value: "||${message.author.tag} (<@${message.author.id}>)||"
							},
							{
								name: "ID", 
								value: "||${message.author.id}||"
							});
							if (${qServerDB.config.channels.logs || false}) this.channels.cache.get("${qServerDB.config.channels.logs}").send({ embed });
							return c;
							});
							}
						`);
						c = c.find(a => a);
						await new Confession({
							guild: c.guildID,
							channel: c.channelID,
							message: c.id,
							author: message.author.id
						}).save();
						return sent.channel.send(`:+1: Your confession has been added to <#${qServerDB.config.channels.confessions}>!`);
					}).catch((e) => {
						console.log(e);
						return sent.channel.send(`:x: Your confession timed out. If you'd still like to submit a confession, just run \`${qServerDB.config.prefix}confess\` again in a server channel!`);
					});
				});
			} else return message.channel.send(":x: No server was found based on your input");
		}).catch((e) => {
			console.log(e)
			return m.channel.send(":x: Server selection timed out. If you'd still like to submit a confession, just run `confess` again in this DM!\n_If this happened immediately after selecting a server or submitting a confession, there may be an internal error - please contact our support team._");
		});
	}
};
