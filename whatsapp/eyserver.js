const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cors = require('cors');
const chatSession = require('./services/aiModel');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const client = new Client({
    authStrategy: new LocalAuth()
});

// Generate QR code for authentication
client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('WhatsApp Bot is Ready!');
});


// API to send WhatsApp message
app.get('/health', (req, res) => {
    if (!client) {
        return res.json({ status: 'Client not initialized' });
    }
    
    if (!client.info) {
        return res.json({ status: 'Client not ready' });
    }
    
    res.json({ 
        status: 'Ready',
        clientInfo: {
            platform: client.info.platform,
            phone: client.info.wid.user,
            pushname: client.info.pushname
        }
    });
});

app.post('/send-message', async (req, res) => {
    console.log("Received body:", req.body); // ✅ Debugging log

    const { choice, chatHistory } = req.body;

    if (!choice || !chatHistory) {
        return res.status(400).json({ error: 'choice and chatHistory are required' });
    }

    console.log(`Choice: ${choice}, ChatHistory:`, chatHistory); // ✅ Debugging log
    const numb = choice.split(" ")[0];  // 🚨 Prevents crashing if choice is undefined

    let number;
    if (numb.trim().toUpperCase() === 'TVS') {
        number = '919016070542';
    } else if (numb.trim().toUpperCase() === 'BANK') {
        number = '918078630257';
    } else {
        number = '918107673144';
    }

    // const number = '918078630257'

    try {
        const formattedNumber = number.includes('@c.us') ? number : `${number}@c.us`;
        const summ = await chatSession.sendMessage(`You are given a conversation of rural Indian person with a bank assistant. After the conversation ends you should make a summary of that conversation considering both the user and assistant perspective. This message should be framed like a message starting from Hello TVS Bank, my name is Sanyam, you can contact me on +916375767633 and attach the summary message with this using ${JSON.stringify(chatHistory, null, 2)}`)  //prompting remaining
        console.log(summ.response.text());
        await client.sendMessage(formattedNumber, summ.response.text());
        console.log(`summary has been sent to ${number}`)
        res.json({ success: true, message: 'Message sent successfully!' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send message', details: error.message });
    }
});

app.post('/send-info', async (req, res) => {
    console.log("Received body:", req.body); // ✅ Debugging log

    const { choice, info } = req.body;

    if (!choice || !info) {
        return res.status(400).json({ error: 'choice and chatHistory are required' });
    }

    // console.log(`Choice: ${choice}, ChatHistory:`, chatHistory); // ✅ Debugging log
    const numb = choice.split(" ")[0];  // 🚨 Prevents crashing if choice is undefined

    let number;
    if (numb.trim().toUpperCase() === 'TVS') {
        number = '919016070542';
    } else if (numb.trim().toUpperCase() === 'BANK') {
        number = '918078630257';
    } else {
        number = '918107673144';
    }

    // const number = '918078630257'

    try {
        const formattedNumber = number.includes('@c.us') ? number : `${number}@c.us`;
        const summ = await chatSession.sendMessage(`${JSON.stringify(info, null, 2)}, now send the details of first name, middle name, last name, address, Pan Card number, gender, Aadhar Number, Date of birth. try to send the details in proper formating of msg`)  //prompting remaining
        await client.sendMessage(formattedNumber, summ.response.text());
        console.log(`summary has been sent to ${number}`)
        res.json({ success: true, message: 'Message sent successfully!' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send message', details: error.message });
    }
});

client.initialize();

app.listen(5005, () => {
    console.log('WhatsApp Web API running on http://localhost:5005');
});
