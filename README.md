# 🪑 Titi Invita - Sistema de Control de Mesas para Eventos

[![DigitalOcean](https://img.shields.io/badge/DigitalOcean-0080FF?style=for-the-badge&logo=DigitalOcean&logoColor=white)](https://digitalocean.com)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)

Sistema completo para la gestión y control de mesas en eventos sociales y corporativos.

## 🚀 Demo Rápida

**Credenciales de prueba:**
- **Admin:** `jorge.flores@titi-app.com` / `Titi-apps2026@!`
- **Cliente:** `cliente@ejemplo.com` / `Titi-apps2026@!`

## ✨ Características

### 👤 Sistema de Usuarios
- Autenticación por rol (Admin/Cliente)
- Dashboard administrativo completo
- Gestión de múltiples eventos

### 🪑 Sistema de Mesas
- Mesas rectangulares, circulares y cuadradas
- Distribución inteligente de sillas
- Asignación de invitados por silla
- Estados: Sin asignar / Asignado / Confirmado

### 📊 Dashboard Admin
- Gestión completa de usuarios
- Vista de todos los eventos
- Estadísticas y reportes
- Configuración del sistema

## 🛠 Tecnologías

- **Frontend:** HTML5, CSS3, JavaScript Vanilla
- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL 15
- **Hosting:** Digital Ocean App Platform
- **Autenticación:** JWT Tokens

## 🚀 Despliegue en Digital Ocean (1 Click)

### Opción A: App Platform (Recomendado)
1. **Sube este repositorio a GitHub**
2. **Ve a [Digital Ocean App Platform](https://cloud.digitalocean.com/apps)**
3. **Haz clic en "Create App" → "From GitHub"**
4. **Selecciona este repositorio**
5. **¡Listo!** Se desplegará automáticamente

### Opción B: Droplet Manual
```bash
# Clonar repositorio
git clone https://github.com/tuusuario/titi-invita.git
cd titi-invita

# Ejecutar script de despliegue
chmod +x scripts/deploy.sh
./scripts/deploy.sh