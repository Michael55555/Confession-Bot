const { developer } = require("../../config.json");
const { fetchUser, dbQueryAll } = require("../../coreFunctions.js");
const humanizeDuration = require("humanize-duration");
const ms = require("ms");
module.exports = {
	controls: {
		name: "ping",
		permission: 10,
		aliases: ["hi", "about", "bot"],
		usage: "ping",
		description: "Checks bot response time and shows information",
		enabled: true,
		dmAvailable: true
	},
	do: async (message, client, args, Discord) => {
		let developerArray = [];
		for await (let developerId of developer) {
			let user = await fetchUser(developerId, client);
			user ? developerArray.push(`${user.tag} (${user.id})`) : developerArray.push(`Unknown User (${developerId})`);
		}
		let premium = (await dbQueryAll("Server", {premium: true})).length;
		const guildCounts = await client.shard.fetchClientValues("guilds.cache.size"); // ['1006', '966']
		const totalGuildCount = guildCounts.reduce((total, current) => total + current, 0);
		let embed = new Discord.MessageEmbed()
			.addField("Developers", developerArray.join("\n"))
			.addField("Guild Count", `${totalGuildCount} (${premium} premium)`)
			.addField("Shard Uptime", humanizeDuration(client.uptime))
			.addField("Shard Ping", `${Math.round(client.ws.ping)} ms`)
			.setFooter(`${client.user.tag} v1.4 - Shard ${client.shard.ids[0]}`, client.user.displayAvatarURL)
			.setThumbnail(client.user.displayAvatarURL({ format: "png" }))
			.setColor("RANDOM");
		message.reply("👋 Hi there! Here's some info:", embed).then((sent) => {
			embed.addField("Edit Time", ms(new Date().getTime() - sent.createdTimestamp));
			sent.edit(`<@${message.author.id}>, 👋 Hi there! Here's some info:`, embed);
		});
	}
};
