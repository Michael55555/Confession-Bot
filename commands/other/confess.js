const { dbQuery } = require("../../coreFunctions");
module.exports = {
	controls: {
		name: "confess",
		permission: 10,
		aliases: ["confession"],
		usage: "confess",
		description: "Enters the prompt to submit a confession in DMs",
		enabled: true,
		permissions: ["VIEW_CHANNEL", "SEND_MESSAGES", "MANAGE_MESSAGES"]
	},
	do: async (message, client, args, Discord) => {
		message.delete();
		let qServerDB = await dbQuery("Server", { id: message.guild.id });
		if (!qServerDB.config.channels.confessions) return message.channel.send(":x: This server has no confessions channel configured!");
		if (qServerDB.config.blocked.includes(message.author.id)) return message.author.send(`:x: You are blocked from submitting confessions on **${message.guild.name}**.`);
		let embed = new Discord.MessageEmbed()
			.setTitle("Confession")
			.setDescription(`What would you like to confess? Reply to this message to submit your confession.\n\nYour confession will be __anonymously__ posted to <#${qServerDB.config.channels.confessions}> as soon as you reply.${qServerDB.config.channels.logs ? "\n> **Note:** Your confession will be logged in a private staff channel with your user information for moderation purposes." : ""}`)
			.setFooter("You have 1 minute to respond - type \"cancel\" to abort");
		message.author.send(embed).then(sent => {
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
				client.channels.cache.get(qServerDB.config.channels.confessions).send(confessEmbed);
				confessEmbed.addField("User", `||${message.author.tag} (<@${message.author.id}>)||`)
					.addField("ID", `||${message.author.id}||`);
				if (qServerDB.config.channels.logs) client.channels.cache.get(qServerDB.config.channels.logs).send(confessEmbed);
				return sent.channel.send(`:+1: Your confession has been added to <#${qServerDB.config.channels.confessions}>!`);
			}).catch(() => {
				return sent.channel.send(`:x: Your confession timed out. If you'd still like to submit a confession, just run \`${qServerDB.config.prefix}confess\` again in a server channel!`);
			});
		}).catch(() => {
			message.reply("I wasn't able to DM you in order to complete your confession! Please ensure that your DMs are unlocked and try again!").then(m => setTimeout(function() {
				m.delete();
			}, 5000));
		});
	}
};
