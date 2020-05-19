const { dbQuery } = require("../coreFunctions");
const { log_hooks } = require("../config.json");
module.exports = async (Discord, client, guild) => {
	if (!guild.available) return;
	(new Discord.WebhookClient(log_hooks.guilds.id, log_hooks.guilds.token)).send(`:inbox_tray: Added to **${guild.name}** (\`${guild.id}\`)\n> Member Count: ${guild.memberCount}`);
	if ((await dbQuery("Server", { id: guild.id })).blocked) return guild.leave();
};
