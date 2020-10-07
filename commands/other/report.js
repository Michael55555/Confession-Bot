const { dbQueryNoNew, fetchUser } = require("../../coreFunctions");
const { global_mod, reports_channel } = require("../../config");
module.exports = {
	controls: {
		name: "report",
		permission: 10,
		usage: "report <message id>",
		description: "Reports a confession to the global moderators",
		enabled: true,
		permissions: ["VIEW_CHANNEL", "SEND_MESSAGES"],
		cooldown: 5
	},
	do: async (message, client, args, Discord) => {
		if (!args[0]) return message.channel.send(":x: You must specify a message ID");
		let confessFound = await dbQueryNoNew("Confession", { message: args[0], guild: message.guild.id });
		if (!confessFound) return message.channel.send(":x: That is not a valid message ID. Please ensure you copied the __message ID__ and that the confession is not too old (confessions submitted before August 28th are not reportable).");
		try {
			let m = await client.channels.cache.get(confessFound.channel).messages.fetch(confessFound.message);
			let embed = new Discord.MessageEmbed(m.embeds[0]);
			let u = await fetchUser(confessFound.author, client);
			embed.setTitle("Reported Confession")
				.addField("Confession Author", `${u.tag} (\`${u.id}\`)`)
				.addField("Guild", `${message.guild.name} (\`${message.guild.id}\`)`)
				.addField("Reporter", `${message.author.tag} (\`${message.author.id}\`)`)
				.addField("Action", `Use \`?admin block ${u.id} true\` to block the user from using the bot and clear their confessions`)
				.setFooter("")
				.setColor("RED");
			await client.shard.broadcastEval(`if (this.channels.cache.get("${reports_channel}")) this.channels.cache.get("${reports_channel}").send({ content: "<@&${global_mod}>", embed: ${JSON.stringify(embed)} })`);
			return message.channel.send(":white_check_mark: Your report has been submitted. A global moderator will review your case and potentially take action against the user who submitted the confession. For privacy reasons, the outcome of your report will not be shared.");
		} catch (e) {
			console.log(e);
			return message.channel.send(":x: The confession message could not be fetched.");
		}
	}
};
