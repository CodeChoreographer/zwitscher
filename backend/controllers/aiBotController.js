const axios = require('axios');

class AiBotController {
    async getBotReply(prompt) {
        try {
            const response = await axios.post('https://text.pollinations.ai/openai', {
                model: 'openai',
                messages: [
                    { role: 'system', content: 'Du bist ein freundlicher, deutschsprachiger Chatbot.' },
                    { role: 'user', content: prompt }
                ],
                seed: 42
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const reply = response.data.choices?.[0]?.message?.content?.trim();
            return reply || '🤖 Ich habe leider keine Antwort erhalten.';
        } catch (error) {
            console.error('❌ Fehler beim Abrufen der Bot-Antwort:', error.message);
            return '❌ Es gab ein Problem beim ZwitscherBot. Versuche es später nochmal.';
        }
    }
}

module.exports = new AiBotController();
