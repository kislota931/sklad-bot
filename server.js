const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const app = express();

// На Vercel файлы можно сохранять ТОЛЬКО во временную папку /tmp
const upload = multer({ dest: '/tmp/' });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Раздаем статические файлы (включая index.html) из корня проекта
app.use(express.static(path.join(__dirname)));

app.post('/send-report', upload.single('photo'), async (req, res) => {
    const { owner, params, reason } = req.body;
    const photo = req.file;

    if (!photo) {
        return res.status(400).send('Ошибка: Вы не сделали фото инструмента.');
    }

    // НАСТРОЙКА ПОЧТЫ (Проверь свои данные здесь)
    let transporter = nodemailer.createTransport({
        host: 'smtp.yandex.ru', 
        port: 465,
        secure: true, 
        auth: {
            user: 'kislota931@yandex.ru', 
            pass: 'qaaqcsbjryxqkwuf' // Сюда твой актуальный пароль приложения
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
                <p style="color: #777; font-size: 12px; margin-top: 20px;">Фотография поломки находится во вложении к этому письму.</p>
            </div>
        `,
        attachments: [
            {
                filename: photo.originalname,
                path: photo.path
            }
        ]
    };

    try {
        await transporter.sendMail(mailOptions);
        
        // Удаляем временный файл
        if (fs.existsSync(photo.path)) {
            fs.unlinkSync(photo.path);
        }
        
        res.send(`
            <div style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h2 style="color: #28a745;">✓ Успешно отправлено!</h2>
                <p>Информация о списании инструмента передана на почту.</p>
                <br>
                <a href="/" style="text-decoration: none; padding: 10px 20px; background: #007bff; color: white; border-radius: 4px;">Назад в форму</a>
            </div>
        `);
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка при отправке письма. Проверьте настройки SMTP.');
    }
});

// КРИТИЧНО ДЛЯ VERCEL: Экспортируем приложение вместо app.listen()
// Принудительно отдаем форму при заходе на главную страницу
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});module.exports = app;