const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const app = express();

// Универсальная папка для фото: /tmp для интернета, или обычная uploads для ПК
const uploadDir = process.env.VERCEL ? '/tmp/' : path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir) && !process.env.VERCEL){
    fs.mkdirSync(uploadDir);
}
const upload = multer({ dest: uploadDir });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Раздаем файлы формы
app.use(express.static(__dirname));

// Принудительно открываем форму на главной странице
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/send-report', upload.single('photo'), async (req, res) => {
    const { owner, params, reason } = req.body;
    const photo = req.file;

    if (!photo) {
        return res.status(400).send('Ошибка: Вы не сделали фото инструмента.');
    }

    // НАСТРОЙКА ПОЧТЫ
    let transporter = nodemailer.createTransport({
        host: 'smtp.yandex.ru', 
        port: 465,
        secure: true, 
        auth: {
            user: 'kislota931@yandex.ru', 
            pass: 'qaaqcsbjryxqkwuf' // Твой пароль приложения
        }
    });

    const mailOptions = {
        from: '"Робот Склада" <kislota931@yandex.ru>', 
        to: 'vg@evess.ru', 
        subject: `⚠️ Списание инструмента: ${owner}`,
        html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; max-width: 600px;">
                <h2 style="color: #d9534f;">Заявка на списание</h2>
                <p><b>Сотрудник:</b> ${owner}</p>
                <p><b>Инструмент/Параметры:</b> ${params}</p>
                <p><b>Причина неисправности:</b> ${reason}</p>
            </div>
        `,
        attachments: [{ filename: photo.originalname, path: photo.path }]
    };

    try {
        await transporter.sendMail(mailOptions);
        if (fs.existsSync(photo.path)) fs.unlinkSync(photo.path);
        
        res.send(`
            <div style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h2 style="color: #28a745;">✓ Успешно отправлено!</h2>
                <p>Информация перенесена на почту.</p>
                <br>
                <a href="/" style="text-decoration: none; padding: 10px 20px; background: #007bff; color: white; border-radius: 4px;">Назад</a>
            </div>
        `);
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка SMTP.');
    }
});

// Запускаем локальный порт, ТОЛЬКО если мы не на Vercel
if (!process.env.VERCEL) {
    const port = 3000;
    app.listen(port, () => {
        console.log(`Сервер успешно запущен на http://localhost:${port}`);
    });
}

module.exports = app;