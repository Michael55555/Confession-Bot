const config = require("../../config.json");

/* eslint-disable-next-line no-unused-vars */
const core = require("../../coreFunctions.js");

module.exports = {
	controls: {
		name: "eval",
		permission: 0,
		usage: "eval <code>",
		description: "Runs code",
		enabled: true,
		permissions: ["VIEW_CHANNEL", "SEND_MESSAGES"]
	},
	/* eslint-disable-next-line no-unused-vars */
	do: async (message, client, args, Discord) => {
		const clean = (text) => {
			if (typeof (text) === "string") {
				return text.replace(/`/g, "`" + String.fromCharCode(8203)).replace(/@/g, "@" + String.fromCharCode(8203));
			} else {
				return text;
			}
		};
		const code = args.join(" ");
		
		try {
			let evaled = await eval(code);

			if (typeof evaled !== "string") {
				evaled = require("util").inspect(evaled);
			}

			if (args.splice(-1)[0] !== "//silent") {
				if (evaled.includes(process.env.TOKEN)) {
					return message.channel.send(":rotating_light: `CENSORED: TOKEN` :rotating_light:");
				} else {
					message.channel.send(clean(evaled).substring(0, 1900), { code: "xl" });
				}
			}
		} catch (err) {
			if (args.splice(-1)[0] !== "//silent") {
				if (err.toString().includes(process.env.TOKEN)) {
					return message.channel.send(":rotating_light: `CENSORED: TOKEN` :rotating_light:");
				} else {
					message.channel.send(`\`ERROR\` \`\`\`xl\n${clean(err)}\n\`\`\``);
				}
			}
		}
	}
};
