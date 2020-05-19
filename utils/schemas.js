const { Schema, model } = require("mongoose");
const { prefix } = require("../config.json");
// IMPORTANT: Snowflakes MUST be Strings, not Numbers

const user = new Schema({
	id: { type: String, required: true }, // user id
	blocked: { type: Boolean, default: false }
});

const settings = new Schema({
	id: { type: String, required: true }, //guild id
	config: {
		channels: {
			confessions: { type: String },
			logs: {type: String }
		},
		prefix: { type: String, default: prefix },
		blocked: [String]
	},
	blocked: { type: Boolean, default: false },
	premium: { type: Boolean, default: false }
});

module.exports = {
	User: model("user", user, "users"),
	Server: model("servers", settings, "settings")
};
