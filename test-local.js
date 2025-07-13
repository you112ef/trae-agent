#!/usr/bin/env node

/**
 * ملف مساعد لاختبار Trae Agent محلياً
 * يستخدم لاختبار API قبل النشر
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// إعدادات الخادم المحلي
const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// إنشاء خادم HTTP بسيط
const server = http.createServer((req, res) => {
    // إعداد CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // التعامل مع طلبات OPTIONS
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // التعامل مع API
    if (req.url === '/api/execute-task' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                console.log('📨 طلب API:', data.task);
                
                // محاكاة استجابة API
                const response = {
                    success: true,
                    response: `تم تنفيذ المهمة بنجاح: ${data.task}`,
                    trajectory: {
                        steps: Math.floor(Math.random() * 5) + 1,
                        duration: `${Math.floor(Math.random() * 10) + 1}s`
                    },
                    files: [
                        {
                            path: 'main.py',
                            action: 'created'
                        },
                        {
                            path: 'test_main.py',
                            action: 'created'
                        }
                    ],
                    output: `# تم إنشاء الملفات بنجاح
# المهمة: ${data.task}
# الوقت: ${new Date().toLocaleString('ar-SA')}
print("تم تنفيذ المهمة بنجاح!")`
                };
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(response));
                
            } catch (error) {
                console.error('❌ خطأ في معالجة الطلب:', error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'خطأ في معالجة الطلب' }));
            }
        });
        return;
    }
    
    // التعامل مع الملفات الثابتة
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(PUBLIC_DIR, filePath);
    
    // التحقق من وجود الملف
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="UTF-8">
                <title>404 - الصفحة غير موجودة</title>
                <style>
                    body { font-family: 'Cairo', sans-serif; text-align: center; padding: 50px; }
                    h1 { color: #ef4444; }
                </style>
            </head>
            <body>
                <h1>404 - الصفحة غير موجودة</h1>
                <p>الملف المطلوب غير موجود</p>
                <a href="/">العودة للصفحة الرئيسية</a>
            </body>
            </html>
        `);
        return;
    }
    
    // تحديد نوع المحتوى
    const ext = path.extname(filePath);
    const contentType = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml'
    }[ext] || 'text/plain; charset=utf-8';
    
    // قراءة وإرسال الملف
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(500);
            res.end('خطأ في الخادم');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

// بدء الخادم
server.listen(PORT, () => {
    console.log(`
🚀 خادم Trae Agent المحلي يعمل على:
   📍 العنوان: http://localhost:${PORT}
   📁 المجلد: ${PUBLIC_DIR}
   ⏰ الوقت: ${new Date().toLocaleString('ar-SA')}

📋 تعليمات الاستخدام:
   1. افتح المتصفح واذهب إلى http://localhost:${PORT}
   2. أدخل مفتاح API (يمكن استخدام أي نص للاختبار)
   3. اكتب مهمة برمجية واضغط "إرسال"
   4. ستظهر استجابة محاكاة من الخادم

🔧 لإيقاف الخادم: اضغط Ctrl+C
    `);
});

// التعامل مع إيقاف الخادم
process.on('SIGINT', () => {
    console.log('\n👋 إيقاف الخادم...');
    server.close(() => {
        console.log('✅ تم إيقاف الخادم بنجاح');
        process.exit(0);
    });
});

// التعامل مع الأخطاء
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ المنفذ ${PORT} مشغول بالفعل`);
        console.log('💡 جرب منفذ آخر أو أوقف التطبيق الذي يستخدم هذا المنفذ');
    } else {
        console.error('❌ خطأ في الخادم:', err);
    }
    process.exit(1);
});