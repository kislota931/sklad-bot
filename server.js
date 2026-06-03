const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
app.use(express.static(__dirname));
const app = express();
const port = 3000;

// Автоматически создаем папку для временного хранения фото, если её нет
if (!fs.existsSync('uploads')){
    fs.mkdirSync('uploads');
}

const upload = multer({ dest: 'uploads/' });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Разрешаем открывать форму из папки компьютера (исправление блокировок CORS)
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.post('/send-report', upload.single('photo'), async (req, res) => {
    const { owner, params, reason } = req.body;
    const photo = req.file;

    if (!photo) {
        return res.status(400).send('Ошибка: Вы не сделали фото инструмента.');
    }

    // ==========================================
    // НАСТРОЙКА ПОЧТЫ (Заполни своими данными)
    // ==========================================
    let transporter = nodemailer.createTransport({
        host: 'smtp.yandex.ru',  // Для Яндекса оставляй так. Для Mail.ru пиши: smtp.mail.ru
        port: 465,
        secure: true, 
        auth: {
            user: 'kislota931@yandex.ru', // Укажи почту, С КОТОРОЙ будут уходить письма
            pass: 'qaaqcsbjryxqkwuf' // Сюда пишем специальный пароль приложения (Шаг 3)
        }
    });

    const mailOptions = {
        from: '"Робот Склада" <kislota931@yandex.ru>', // Повтори почту отправителя тут
        to: 'vg@evess.ru', // Укажи почту, НА КОТОРУЮ должны приходить уведомления
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
        // Удаляем временный файл с компьютера после отправки, чтобы не забивать место
        fs.unlinkSync(photo.path); 
        
        // Красивый ответ пользователю
        res.send(`
            <div style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h2 style="color: #28a745;">✓ Успешно отправлено!</h2>
                <p>Информация о списании инструмента передана на почту.</p>
                <br>
                <a href="javascript:history.back()" style="text-decoration: none; padding: 10px 20px; background: #007bff; color: white; border-radius: 4px;">Назад в форму</a>
            </div>
        `);
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка при отправке письма. Проверьте настройки SMTP.');
    }
});

app.listen(port, () => {
    console.log(`Сервер успешно запущен на http://localhost:${port}`);
});