const { log_hooks } = require("../config.json");
module.exports = async (Discord, client, guild) => {
	if (!guild.available) return;
	(new Discord.WebhookClient(log_hooks.guilds.id, log_hooks.guilds.token)).send(`:outbox_tray: Left **${guild.name}** (\`${guild.id}\`)\n> Member Count: ${guild.memberCount}`);
};
