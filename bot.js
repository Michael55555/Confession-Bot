require("dotenv").config();

const Discord = require("discord.js");
const { errorLog, fileLoader } = require("./coreFunctions.js");
const { connect, connection } = require("mongoose");
const autoIncrement = require("mongoose-sequence");
const { basename, dirname } = require("path");
const { presence } = require("./persistent.json");

const client = new Discord.Client({
	ws: { intents: Discord.Intents.NON_PRIVILEGED },
	disableMentions: "everyone",
	messageCacheLifetime: 120,
	messageSweepInterval: 300,
	presence: { activity: { name: presence.activity || "", type: presence.type || "PLAYING" }, status: presence.status || "online" }
});

connect(process.env.MONGO, {
	useNewUrlParser: true,
	useUnifiedTopology: true
})
	.catch((err) => {
		throw new Error(err);
	});
autoIncrement(connection);
connection.on("open", () => {
	console.log("Connected to MongoDB!");
});
connection.on("error", (err) => {
	console.error("Connection error: ", err);
});

client.commands = new Discord.Collection();
client.cooldowns = new Discord.Collection();
(async () => {
	let eventFiles = await fileLoader("events");
	for await (let file of eventFiles) {
		if (!file.endsWith(".js")) continue;

		let event = require(file);
		let eventName = basename(file).split(".")[0];

		client.on(eventName, (...args) => {
			try {
				event(Discord, client, ...args);
			}
			catch (err) {
				errorLog(err, "Event Handler", `Event: ${eventName}`);
			}
		});
		console.log("[Event] Loaded", eventName);
	}

	let commandFiles = await fileLoader("commands");
	for await (let file of commandFiles) {
		if (!file.endsWith(".js")) return;
		let command = require(file);
		let commandName = basename(file).split(".")[0];

		let dirArray = dirname(file).split("/");
		command.controls.module = dirArray[dirArray.length-1];

		client.commands.set(commandName, command);
		console.log("[Command] Loaded", commandName);
	}
})();

client.login(process.env.TOKEN)
	.catch(console.error);

client.on("error", (err) => {
	errorLog(err, "error", "something happened and idk what");
});
client.on("warn", (warning) => {
	console.warn(warning);
});
process.on("unhandledRejection", (err) => { // this catches unhandledPromiserejectionWarning and other unhandled rejections
	errorLog(err, "unhandledRejection", "oof something is broken x.x");
});

Object.defineProperty(Number.prototype, "toFixed", {
	value: function(size){
		// eslint-disable-next-line no-useless-escape
		let re = new RegExp("^-?\\d+(?:\.\\d{0," + (size || -1) + "})?");
		return this.toString().match(re)[0];
	}
});
