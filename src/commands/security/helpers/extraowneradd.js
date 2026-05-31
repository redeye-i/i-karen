const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require("discord.js");

const Antinuke = require("../../../models/antinuke");
const AntiNukeMemory = require("../../../core/antinukeMemory");

async function extraowneradd(client, message, args) {
  if (!message.guild) return;

  const data = await Antinuke.findById(message.guild.id);
  if (!data) return message.reply("No data found.");

  if (message.author.id !== message.guild.ownerId) {
    return message.reply("#- Only the server owner can use this.");
  }

  const target = message.mentions.members.first() || message.guild.members.cache.get(args[1]);
  if (!target) {
    return message.reply("#- Usage: extraowner add @user");
  }

  if (target.id === message.guild.ownerId) {
    return message.reply("The server owner cannot be an extra owner.");
  }

  if (data.extraowner.includes(target.id)) {
    return message.reply(`${target.user.tag} is already an extra owner.`);
  }

  if (data.extraowner.length >= 10) {
     return message.reply("You have reached the maximum number of extra owners (10).");
  }

  data.extraowner.push(target.id);
  await data.save();

  const g = AntiNukeMemory.get(message.guild.id);
  if (g) {
    g.extraOwners.add(target.id);
  }

  const panel = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## Done\n${target.user.tag} added as an extra owner.`),
  );

  return message.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [panel],
  });
}

module.exports = { extraowneradd };
