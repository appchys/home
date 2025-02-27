const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Cargar credenciales desde variable de entorno
const loadCredentials = () => {
    const credentialsEnv = process.env.GOOGLE_CREDENTIALS;
    if (!credentialsEnv) {
        console.error('No se encontró GOOGLE_CREDENTIALS en las variables de entorno. Asegúrate de configurarlo.');
        process.exit(1);
    }
    try {
        return JSON.parse(credentialsEnv);
    } catch (error) {
        console.error('Error al parsear GOOGLE_CREDENTIALS:', error);
        process.exit(1);
    }
};

// Configuración de autenticación para Google Sheets y Drive
const auth = new google.auth.GoogleAuth({
    credentials: loadCredentials(),
    scopes: [
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/drive.readonly' // Añadido para Drive
    ],
});
const sheets = google.sheets({ version: 'v4', auth });
const drive = google.drive({ version: 'v3', auth });

const SPREADSHEET_ID = '1I8nFa8D_RmsoVxTYoH04mqaXshCp_DR0G6X4ez2lfYo';

// Función genérica para obtener datos de una hoja
async function getSheetData(sheetName) {
    try {
        const sheetMeta = await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID,
            fields: 'sheets(properties,data.rowData.values)',
        });
        const sheet = sheetMeta.data.sheets.find(s => s.properties.title === sheetName);
        const lastColumn = String.fromCharCode(65 + (sheet.properties.gridProperties.columnCount - 1));

        const range = `${sheetName}!A1:${lastColumn}`;
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range,
        });

        const rows = response.data.values;
        if (!rows || rows.length < 2) {
            throw new Error(`No se encontraron datos en la hoja ${sheetName}`);
        }

        const headers = rows[0].map(h => h.toLowerCase().replace(/\s+/g, '_'));
        const dataRows = rows.slice(1);

        return dataRows.map(row =>
            headers.reduce((obj, header, index) => {
                obj[header] = row[index] || '';
                return obj;
            }, {})
        );
    } catch (error) {
        console.error(`Error al obtener datos de ${sheetName}:`, error.message);
        throw error;
    }
}

// Ruta para obtener departamentos
app.get('/api/departamentos', async (req, res) => {
    try {
        const departamentos = await getSheetData('Home');
        res.json(departamentos);
    } catch (error) {
        console.error('Error al obtener departamentos:', error.message);
        res.status(500).json({ error: 'Error al obtener departamentos' });
    }
});

// Ruta para obtener fotos de un departamento
app.get('/api/fotos/:id_home', async (req, res) => {
    try {
        const fotos = await getSheetData('Fotos');
        const idHome = req.params.id_home;
        const fotosDepto = fotos.filter(foto => foto.id_home === idHome);
        res.json(fotosDepto);
    } catch (error) {
        console.error('Error al obtener fotos:', error.message);
        res.status(500).json({ error: 'Error al obtener fotos' });
    }
});

// Ruta para obtener imágenes desde Google Drive usando la API
app.get('/api/image/:id', async (req, res) => {
    const fileId = req.params.id;
    try {
        console.log(`Solicitando imagen con ID: ${fileId}`);
        const response = await drive.files.get(
            { fileId, alt: 'media' },
            { responseType: 'stream' }
        );
        res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
        response.data.pipe(res);
    } catch (error) {
        console.error('Error al obtener imagen de Drive:', error.message);
        res.status(500).send('Error al cargar la imagen');
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});