/**
 * SERVIDOR DE GESTIÓN VETERINARIA - BP VETERINARIA
 * Tecnologías: Node.js, Express, Mongoose (MongoDB Atlas)
 */

const express  = require('express');
const mongoose = require('mongoose');
const path     = require('path');

// Carga las variables de entorno desde el archivo .env
// Instala el paquete con: npm install dotenv
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// MIDDLEWARES
// ==========================================
app.use(express.json());          // Permite recibir JSON en el body
app.use(express.static(__dirname)); // Sirve index.html y assets estáticos

// ==========================================
// CONEXIÓN A MONGODB ATLAS
// ==========================================
// La URI se lee desde la variable de entorno MONGODB_URI definida en .env
// Formato esperado:
//   mongodb+srv://<usuario>:<contraseña>@<cluster>.mongodb.net/<baseDeDatos>?retryWrites=true&w=majority
//
// Si no se define MONGODB_URI, el servidor lanza un error claro y termina.

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ ERROR: La variable de entorno MONGODB_URI no está definida.');
  console.error('   Crea un archivo .env con la siguiente línea:');
  console.error('   MONGODB_URI=mongodb+srv://<usuario>:<contraseña>@<cluster>.mongodb.net/bp_veterinaria?retryWrites=true&w=majority');
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('🚀 Conexión exitosa a MongoDB Atlas');
    seedDatabase(); // Puebla la BD con datos de prueba si está vacía
  })
  .catch(err => {
    console.error('❌ Error crítico de conexión a Atlas:', err.message);
    process.exit(1);
  });

// Eventos de conexión útiles para monitoreo en producción
mongoose.connection.on('disconnected', () => console.warn('⚠️  Mongoose desconectado de Atlas'));
mongoose.connection.on('reconnected',  () => console.log('🔄 Mongoose reconectado a Atlas'));

// ==========================================
// MODELOS DE DATOS (ESQUEMAS)
// ==========================================

// 1. Pacientes: Información de mascotas
const Paciente = mongoose.model('Paciente', new mongoose.Schema({
    nombre: String, especie: String, raza: String, edad: Number, propietario: String
}, { timestamps: true }));

// 2. Citas: Agenda médica
const Cita = mongoose.model('Cita', new mongoose.Schema({
    fecha: String, hora: String, mascota: String, veterinario: String, motivo: String
}, { timestamps: true }));

// 3. Veterinarios: Personal clínico
const Veterinario = mongoose.model('Veterinario', new mongoose.Schema({
    nombre: String, especialidad: String, telefono: String, turno: String
}, { timestamps: true }));

// 4. Inventario: Productos y stock
const Inventario = mongoose.model('Inventario', new mongoose.Schema({
    producto: String, categoria: String, stock: Number, precio: Number
}, { timestamps: true }));

// 5. Facturas: Control financiero
const Factura = mongoose.model('Factura', new mongoose.Schema({
    cliente: String, total: Number, metodoPago: String, estado: String
}, { timestamps: true }));

// 6. Servicios: Catálogo de precios
const Servicio = mongoose.model('Servicio', new mongoose.Schema({
    nombreServicio: String, duracion: String, costo: Number, sala: String
}, { timestamps: true }));

// ==========================================
// RUTAS DE LA API (CRUD COMPLETO)
// ==========================================

/**
 * Genera las 4 rutas REST básicas para un modelo de Mongoose.
 * @param {string}           ruta   - Nombre del endpoint (ej: 'pacientes')
 * @param {mongoose.Model}   Modelo - Modelo de Mongoose a usar
 */
function generarRutasCRUD(ruta, Modelo) {
    // GET - Leer todos los documentos
    app.get(`/api/${ruta}`, async (req, res) => {
        try {
            res.json(await Modelo.find().lean());
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // POST - Crear un nuevo documento
    app.post(`/api/${ruta}`, async (req, res) => {
        try {
            const nuevo = new Modelo(req.body);
            await nuevo.save();
            res.status(201).json(nuevo);
        } catch (e) {
            res.status(400).json({ error: e.message });
        }
    });

    // PUT - Actualizar un documento por ID
    app.put(`/api/${ruta}/:id`, async (req, res) => {
        try {
            const actualizado = await Modelo.findByIdAndUpdate(
                req.params.id,
                req.body,
                { new: true, runValidators: true }
            );
            if (!actualizado) return res.status(404).json({ error: 'Documento no encontrado' });
            res.json(actualizado);
        } catch (e) {
            res.status(400).json({ error: e.message });
        }
    });

    // DELETE - Eliminar un documento por ID
    app.delete(`/api/${ruta}/:id`, async (req, res) => {
        try {
            const eliminado = await Modelo.findByIdAndDelete(req.params.id);
            if (!eliminado) return res.status(404).json({ error: 'Documento no encontrado' });
            res.json({ mensaje: 'Eliminado correctamente' });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
}

// Registra los endpoints para todas las colecciones
generarRutasCRUD('pacientes',    Paciente);
generarRutasCRUD('citas',        Cita);
generarRutasCRUD('veterinarios', Veterinario);
generarRutasCRUD('inventario',   Inventario);
generarRutasCRUD('facturas',     Factura);
generarRutasCRUD('servicios',    Servicio);

// ==========================================
// SEEDING (DATOS INICIALES DE PRUEBA)
// ==========================================
async function seedDatabase() {
    const count = await Paciente.countDocuments();
    if (count === 0) {
        console.log('🌱 Poblando base de datos inicial en Atlas...');
        await Paciente.insertMany([
            { nombre: 'Toby', especie: 'Perro', raza: 'Golden',  edad: 3, propietario: 'Carlos Mendoza' },
            { nombre: 'Luna', especie: 'Gato',  raza: 'Siamés',  edad: 2, propietario: 'Ana Gómez'     }
        ]);
        await Cita.insertMany([
            { fecha: '2026-05-26', hora: '09:00 AM', mascota: 'Toby', veterinario: 'Dr. Ramírez', motivo: 'Vacunación' }
        ]);
        await Veterinario.insertMany([
            { nombre: 'Dr. Hugo Ramírez', especialidad: 'Traumatología', telefono: '555-0192', turno: 'Mañana' }
        ]);
        await Inventario.insertMany([
            { producto: 'Antibiótico Amoxicilina', categoria: 'Fármacos', stock: 45, precio: 250 }
        ]);
        await Factura.insertMany([
            { cliente: 'Carlos Mendoza', total: 600, metodoPago: 'Tarjeta', estado: 'Pagado' }
        ]);
        await Servicio.insertMany([
            { nombreServicio: 'Consulta General', duracion: '30 min', costo: 350, sala: 'Consultorio 1' }
        ]);
        console.log('✅ Datos de prueba insertados correctamente en Atlas');
    }
}

// ==========================================
// INICIAR SERVIDOR
// ==========================================
app.listen(PORT, () => {
    console.log(`🌐 Servidor corriendo en http://localhost:${PORT}`);
});