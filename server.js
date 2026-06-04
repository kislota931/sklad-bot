const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const app = express();

const uploadDir = process.env.VERCEL ? '/tmp/' : path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir) && !process.env.VERCEL){
    fs.mkdirSync(uploadDir);
}
// Важно: настраиваем multer на прием МНОЖЕСТВА файлов из поля 'photos'
const upload = multer({ dest: uploadDir });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Настраиваем роут на массив картинок (максимум, например, 10 штук за раз)
app.post('/send-report', upload.array('photos', 10), async (req, res) => {
    // Умный сбор данных: проверяем оба варианта написания (со скобками и без)
    const owner = req.body.owner;
    const params = req.body['params[]'] || req.body.params;
    const reasons = req.body['reason[]'] || req.body.reason;
    const photos = req.files;

    if (!photos || photos.length === 0) {
        return res.status(400).send('Ошибка: Вы не прикрепили фотографии.');
    }

    // Железно превращаем в массивы, чтобы цикл не ломался
    const paramsList = Array.isArray(params) ? params : [params].filter(Boolean);
    const reasonsList = Array.isArray(reasons) ? reasons : [reasons].filter(Boolean);

    // Если вдруг массивы оказались пустыми, подстрахуемся дефолтными значениями
    const maxItems = Math.max(paramsList.length, reasonsList.length, 1);

    // Формируем красивый список инструментов для HTML-письма
    let toolsHtmlRows = '';
    for (let i = 0; i < paramsList.length; i++) {
        toolsHtmlRows += `
            <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 10px;"><b>№${i + 1}</b></td>
                <td style="padding: 10px;">${paramsList[i]}</td>
                <td style="padding: 10px; color: #d9534f;">${reasonsList[i]}</td>
                <td style="padding: 10px; font-size: 12px; color: #777;">Фото ${i + 1} (во вложении)</td>
            </tr>
        `;
    }

    // Готовим вложения (картинки) для отправки
    const attachments = photos.map((file, index) => ({
        filename: `Позиция_${index + 1}_${file.originalname}`,
        path: file.path
    }));

    // НАСТРОЙКА ПОЧТЫ
    let transporter = nodemailer.createTransport({
        host: 'smtp.yandex.ru', 
        port: 465,
        secure: true, 
        auth: {
            user: 'kislota931@yandex.ru', 
            pass: 'qaaqcsbjryxqkwuf' // Твой пароль приложения Яндекса
        }
    });

    const mailOptions = {
        from: '"Робот Склада" <kislota931@yandex.ru>', 
        to: 'vg@evess.ru', 
        subject: `⚠️ Общее списание инструментов. Сотрудник: ${owner}`,
        html: `
            <div style="font-family: sans-serif; padding: 20px; max-width: 700px; border: 1px solid #eee;">
                <h2 style="color: #333;">Сводная заявка на списание</h2>
                <p><b>Ответственный сотрудник:</b> ${owner}</p>
                <p><b>Количество позиций:</b> ${paramsList.length}</p>
                
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px; text-align: left;">
                    <thead>
                        <tr style="background-color: #f8f9fa; border-bottom: 2px solid #ddd;">
                            <th style="padding: 10px;">Поз.</th>
                            <th style="padding: 10px;">Инструмент / Параметры</th>
                            <th style="padding: 10px;">Причина поломки</th>
                            <th style="padding: 10px;">Файл</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${toolsHtmlRows}
                    </tbody>
                </table>
                <p style="color: #666; font-size: 13px; margin-top: 25px;">*Все фотографии распределены по позициям и прикреплены вложениями к этому письму.</p>
            </div>
        `,
        attachments: attachments
    };

    try {
        await transporter.sendMail(mailOptions);
        
        // Чистим за собой временные файлы
        photos.forEach(file => {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        });
        
        res.send(`
            <div style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h2 style="color: #28a745;">✓ Пакет успешно отправлен!</h2>
                <p>Все инструменты (${paramsList.length} шт.) зарегистрированы и отправлены на почту.</p>
                <br>
                <a href="/" style="text-decoration: none; padding: 10px 20px; background: #007bff; color: white; border-radius: 4px;">Вернуться в форму</a>
            </div>
        `);
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка при отправке пакетного письма.');
    }
});

if (!process.env.VERCEL) {
    const port = 3000;
    app.listen(port, () => {
        console.log(`Многопозиционный сервер запущен на http://localhost:${port}`);
    });
}

module.exports = app;