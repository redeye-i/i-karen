const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require("discord.js");

const Antinuke = require("../../../models/antinuke");
const AntiNukeMemory = require("../../../core/antinukeMemory");

async function extraownerremove(client, message, args) {
  if (!message.guild) return;

  const data = await Antinuke.findById(message.guild.id);
  if (!data) return message.reply("No data found.");

  if (message.author.id !== message.guild.ownerId) {
    return message.reply("#- Only the server owner can use this.");
  }

  const targetId = message.mentions.users.first()?.id || args[1];
  if (!targetId) {
    return message.reply("#- Usage: extraowner remove @user/ID");
  }

  if (!data.extraowner.includes(targetId)) {
    return message.reply("This user is not an extra owner.");
  }

  data.extraowner = data.extraowner.filter((id) => id !== targetId);
  await data.save();

  const g = AntiNukeMemory.get(message.guild.id);
  if (g) {
    g.extraOwners.delete(targetId);
  }

  const panel = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## Done\nRemoved ${targetId} from extra owners.`),
  );

  return message.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [panel],
  });
}

module.exports = { extraownerremove };
