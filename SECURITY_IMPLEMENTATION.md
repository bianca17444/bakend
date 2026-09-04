# 🔒 SEGURIDAD Y RATE LIMITING - DOCUMENTACIÓN COMPLETA

## 📋 Tabla de Contenidos
1. [Resumen de Cambios](#resumen-de-cambios)
2. [Sistema de Rate Limiting](#sistema-de-rate-limiting)
3. [Medidas de Seguridad](#medidas-de-seguridad)
4. [Guía de Uso](#guía-de-uso)
5. [Configuración](#configuración)
6. [Testing](#testing)

---

## 🔄 Resumen de Cambios

### Archivos Creados
```
src/config/rateLimit.config.js          # Configuración centralizada de rate limiting
src/security/headers.middleware.js       # Middleware de seguridad headers y protecciones
.env.example                             # Variables de entorno de ejemplo
RATE_LIMITING_GUIDE.md                   # Guía detallada de rate limiting
peticiones-rate-limit.http               # Suite de testing
```

### Archivos Modificados
```
src/security/rateLimit.middleware.js     # Mejorado: almacenamiento robusto, estadísticas
src/security/auth.middleware.js          # Mejorado: protección brute force, mejores errores
src/security/validation.middleware.js    # Mejorado: validación de contraseña más estricta
src/controllers/users.controller.js      # Mejorado: manejo de brute force, mejor logging
src/router/users.route.js                # Mejorado: roles admin, brute force check
src/router/materias.route.js             # Mejorado: deleteRateLimiter, roles admin
src/router/cursan.route.js               # Mejorado: deleteRateLimiter, roles admin
src/router/dictan.route.js               # Mejorado: roles admin para edición
app.js                                   # Mejorado: middleware de seguridad global
```

---

## 🛡️ Sistema de Rate Limiting

### Arquitectura General

```
┌─────────────────────────────────────────────┐
│         Cliente HTTP / Navegador             │
└────────────────┬────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────┐
│         Headers de Seguridad                 │
│   (CSP, X-Frame-Options, HSTS, etc)         │
└────────────────┬────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────┐
│   Validación Content-Type & Sanitización   │
│     (JSON validation, XSS prevention)       │
└────────────────┬────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────┐
│       Detección de Patrones de Ataque       │
│     (SQL Injection, XSS, CSRF checks)       │
└────────────────┬────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────┐
│         Análisis de Rate Limit               │
│   (IP-based o User-based con roles)         │
└────────────────┬────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────┐
│    Autenticación & Brute Force Protection   │
│      (JWT verification, login attempts)     │
└────────────────┬────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────┐
│          Autorización por Rol               │
│   (Student, Teacher, Admin permissions)     │
└────────────────┬────────────────────────────┘
                 │
                 ↓
        ┌────────────────────┐
        │  Endpoint Handler   │
        └────────────────────┘
```

### Limitadores Implementados

#### 1️⃣ AUTH LIMITER (Más Restrictivo)
```
Ventana: 15 minutos
Límite: 5 peticiones
Endpoints: POST /users/login, POST /users (registro)
Objetivo: Prevenir fuerza bruta
```

**Respuesta 429**:
```json
{
  "status": 429,
  "error": "Too Many Requests",
  "message": "Demasiados intentos. Por favor, intente de nuevo en 890 segundos.",
  "retryAfter": 890,
  "resetTime": "2024-08-14T15:45:30.000Z"
}
```

#### 2️⃣ READ LIMITER (Moderado)
```
Ventana: 1 minuto
Límites por rol:
  - Admin: 500/min
  - Profesor: 200/min
  - Alumno: 100/min
  - Público: 20/5min

Endpoints: GET / (todas las consultas)
Objetivo: Evitar scraping y sobrecarga
```

#### 3️⃣ WRITE LIMITER (Restrictivo)
```
Ventana: 1 minuto
Límites por rol:
  - Admin: 150/min
  - Profesor: 60/min
  - Alumno: 20/min

Endpoints: POST /, PUT /:id
Objetivo: Proteger integridad de datos
```

#### 4️⃣ DELETE LIMITER (Muy Restrictivo)
```
Ventana: 5 minutos
Límites por rol:
  - Admin: 50/5min
  - Profesor: 20/5min
  - Alumno: 5/5min

Endpoints: DELETE /:id
Objetivo: Máxima protección contra borrados
```

### Identificación de Cliente

```javascript
// Jerarquía de identificación:
1. Si hay JWT en Authorization header → User ID
2. Si hay usuario en req.user → User ID
3. Fallback → IP del cliente

// Ejemplo
ip: "192.168.1.100"
→ identifier: "ip:192.168.1.100"

userId: "123e4567-e89b-12d3-a456-426614174000"
→ identifier: "user:123e4567-e89b-12d3-a456-426614174000"
```

### Almacenamiento y Limpieza

```javascript
// Almacenamiento: Map en memoria (desarrollo)
store = new Map()
{
  "user:123": {
    count: 5,
    resetTime: 1692031530000,
    blocked: false
  }
}

// Limpieza automática:
- Cada 5 minutos: eliminar entradas expiradas
- Si hay > 10k entradas: eliminar 20% más antiguo
- Manual: RateLimitStore.clear(key) o clearAll()
```

---

## 🔐 Medidas de Seguridad

### 1. Protección contra Fuerza Bruta

```javascript
// Mecanismo
1. Registrar cada intento fallido de login
2. Después de 5 fallos en 15 minutos → BLOQUEO
3. Bloqueo dura 15 minutos
4. Respuesta 429 con tiempo de espera

// Ejemplo
Intento 1 (fallo) → Contador = 1
Intento 2 (fallo) → Contador = 2
Intento 3 (fallo) → Contador = 3
Intento 4 (fallo) → Contador = 4
Intento 5 (fallo) → Contador = 5 → BLOQUEADO
Intento 6 → Status 429 "Account locked, retry in 900 seconds"

// Código
export function checkBruteForce(req, res, next) {
  const identifier = req.body.email?.toLowerCase() || req.ip;
  
  if (isAccountLocked(identifier)) {
    return res.status(429).json({
      message: "Account temporarily locked",
      retryAfter: remainingTime
    });
  }
  
  res.recordFailedLogin = () => recordFailedLogin(identifier);
  res.clearLoginAttempts = () => clearLoginAttempts(identifier);
  next();
}
```

### 2. Validación de Contraseñas

```
Política de Contraseña:
✓ Mínimo 8 caracteres
✓ Mínimo 1 mayúscula (A-Z)
✓ Mínimo 1 número (0-9)
✓ Mínimo 1 carácter especial (!@#$%^&*)

Ejemplo válido: MySecurePass@2024
Ejemplo inválido: password123

Validación:
function validatePasswordStrength(password) {
  const errors = [];
  
  if (password.length < 8) 
    errors.push("Mínimo 8 caracteres");
  if (!/[A-Z]/.test(password)) 
    errors.push("Mínimo 1 mayúscula");
  if (!/\d/.test(password)) 
    errors.push("Mínimo 1 número");
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) 
    errors.push("Mínimo 1 carácter especial");
  
  return { isValid: errors.length === 0, errors };
}
```

### 3. Headers de Seguridad HTTP

| Header | Valor | Propósito |
|--------|-------|----------|
| X-Content-Type-Options | nosniff | Prevenir MIME-sniffing |
| X-Frame-Options | DENY | Prevenir clickjacking |
| X-XSS-Protection | 1; mode=block | Protección XSS |
| Content-Security-Policy | default-src 'self' | Política de seguridad de contenido |
| Strict-Transport-Security | max-age=31536000 | Forzar HTTPS (prod only) |
| Referrer-Policy | strict-origin-when-cross-origin | Control de referrer |
| Permissions-Policy | geolocation=(), ... | Restricción de características |

### 4. Prevención de Ataques Comunes

#### SQL Injection
```javascript
// Detección
const sqlPatterns = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|EXEC|SCRIPT)\b)/i;

// Prevención
- Queries parametrizadas
- Sanitización de entrada
- Validación de tipos

// Ejemplo seguro
const query = "SELECT * FROM users WHERE email = $1";
const result = await pool.query(query, [email]);

// Ejemplo inseguro (VULNERABLE)
const query = `SELECT * FROM users WHERE email = '${email}'`;
```

#### XSS (Cross-Site Scripting)
```javascript
// Entrada peligrosa
<script>alert('XSS')</script>

// Sanitización
const sanitizeObject = (obj) => {
  for (const key in obj) {
    if (typeof obj[key] === "string") {
      // Remover caracteres HTML
      obj[key] = obj[key].replace(/[<>\"'`]/g, "").trim();
    }
  }
}

// Resultado
"&lt;script&gt;alert('XSS')&lt;/script&gt;"
```

#### CSRF (Cross-Site Request Forgery)
```javascript
// Validación de Content-Type
if (!contentType || !contentType.includes("application/json")) {
  return res.status(400).json({
    message: "Content-Type debe ser application/json"
  });
}

// CSRF Token check (en cambios de estado)
const csrfToken = req.headers["x-csrf-token"];
if (process.env.NODE_ENV === "production" && !csrfToken) {
  return res.status(403).json({ message: "CSRF token requerido" });
}
```

### 5. Autorización Basada en Roles

```
Matriz de Permisos:

                     ALUMNO  PROFESOR  ADMIN
GET /users            ✗        ✓        ✓
POST /users           ✓        ✓        ✓
GET /users/:id        ◆        ✓        ✓
PUT /users/:id        ◆        ◆        ✓
DELETE /users/:id     ✗        ✗        ✓

GET /materias         ✓        ✓        ✓
POST /materias        ✗        ✓        ✓
PUT /materias/:id     ✗        ✓        ✓
DELETE /materias/:id  ✗        ✗        ✓

POST /cursan          ◆        ✓        ✓
DELETE /cursan/:id    ◆        ✓        ✓

PUT /dictan/:id       ✗        ✗        ✓

✓ = Permitido
✗ = Denegado
◆ = Propio usuario solo / Si es dueño
```

---

## 📖 Guía de Uso

### Configuración Inicial

1. **Copiar variables de entorno**
   ```bash
   cp .env.example .env
   ```

2. **Editar .env**
   ```bash
   PORT=3000
   JWT_SECRET=tu_secreto_super_seguro_y_largo_2024
   DB_HOST=localhost
   DB_PORT=5432
   NODE_ENV=development
   ```

3. **Instalar dependencias**
   ```bash
   npm install
   ```

4. **Iniciar servidor**
   ```bash
   npm start
   ```

### Endpoints Principales

#### Autenticación
```
POST /users                  # Registrar
POST /users/login           # Login

Headers de respuesta:
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 1692031530
```

#### Usuarios (Protegidos)
```
GET /users                  # Solo profesor/admin
GET /users/:id             # Profesor/admin o propio
PUT /users/:id             # Profesor/admin o propio
DELETE /users/:id          # Solo admin
```

#### Materias
```
GET /materias              # Todos autenticados
GET /materias/:id          # Todos autenticados
POST /materias             # Profesor/admin
PUT /materias/:id          # Profesor/admin
DELETE /materias/:id       # Solo admin
```

#### Inscripciones
```
GET /cursan                # Solo profesor/admin
POST /cursan               # Profesor/admin o propio
DELETE /cursan/:id         # Profesor/admin o propio
```

### Ejemplo de Flujo Completo

```bash
# 1. Registrarse
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Juan García",
    "email": "juan@example.com",
    "password": "SecurePass@2024",
    "role": "alumno"
  }'

# Respuesta:
{
  "status": 201,
  "message": "Usuario registrado exitosamente",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Juan García",
    "email": "juan@example.com",
    "rol": "alumno"
  }
}

# 2. Login
curl -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan@example.com",
    "password": "SecurePass@2024"
  }'

# Respuesta:
{
  "status": 200,
  "message": "Login exitoso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Juan García",
    "email": "juan@example.com",
    "rol": "alumno"
  }
}

# 3. Usar token en peticiones
curl -X GET http://localhost:3000/materias \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Respuesta con headers de rate limit:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 99
# X-RateLimit-Reset: 1692031530
```

---

## ⚙️ Configuración

### Personalizar Rate Limits

Editar `src/config/rateLimit.config.js`:

```javascript
// Cambiar límite de auth
auth: {
  windowMs: 20 * 60 * 1000,  // 20 minutos
  max: 10,                    // 10 intentos
}

// Cambiar límite por rol
read: {
  roleLimits: {
    admin: 1000,    // Mayor para admin
    profesor: 300,
    alumno: 150,    // Menor para alumno
  }
}

// Agregar límite específico de endpoint
endpoints: {
  "POST /materias": {
    windowMs: 2 * 60 * 1000,
    max: 10,
  }
}
```

### Variables de Entorno

```bash
# Seguridad
JWT_SECRET=tu_secreto_super_fuerte
NODE_ENV=production

# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tu_bd
DB_USER=usuario
DB_PASSWORD=contraseña

# API
PORT=3000
CORS_ORIGIN=https://tudominio.com

# Debug
DEBUG=false
```

---

## 🧪 Testing

### Suite de Testing Completa

Archivo: `peticiones-rate-limit.http`

Incluye:
- Testing de autenticación
- Testing de rate limits por tipo
- Testing de seguridad (SQL injection, XSS)
- Testing de autorización
- Testing de headers

### Ejecutar Tests

```bash
# Usar VS Code REST Client
# Abrir peticiones-rate-limit.http
# Click en "Send Request"

# O usar curl
bash testing-script.sh
```

### Monitorar Rate Limiting

```bash
# Ver estadísticas (solo admin)
curl http://localhost:3000/api/admin/rate-limit-stats \
  -H "Authorization: Bearer <admin_token>" | jq

# Ver logs de seguridad
tail -f logs/security.log | grep "RATE LIMIT"

# Filtrar por tipo de evento
grep "\[BRUTE FORCE\]" logs/security.log
grep "\[ATTACK DETECTED\]" logs/security.log
```

### Caso de Prueba: Detección de Fuerza Bruta

```bash
#!/bin/bash

echo "Realizando 6 intentos de login (5 fallan, 6 bloqueado)..."

for i in {1..6}; do
  echo -e "\n=== Intento $i ==="
  curl -X POST http://localhost:3000/users/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "password": "wrong_password"
    }' | jq '{status: .status, message: .message}'
  
  sleep 1
done

# Resultado esperado:
# Intentos 1-5: Status 401 "Email o contraseña incorrectos"
# Intento 6: Status 429 "Account temporarily locked"
```

---

## 🚨 Monitoreo en Producción

### Alertas Clave

```javascript
// BRUTE FORCE DETECTED
[BRUTE FORCE DETECTED] Account user@example.com locked

// RATE LIMIT WARNING (cuando quedan < 20% peticiones)
[RATE LIMIT WARNING] ip:192.168.1.100 - 80/100 requests

// ATTACK DETECTED
[ATTACK DETECTED] 192.168.1.100 - Potential attack attempt

// SECURITY WARNING
[SECURITY] 192.168.1.100 user123 - POST /users - Status: 401

// AUDIT LOG
[AUDIT] 192.168.1.100 admin_id - DELETE /users/123 - Status: 200
```

### Dashboards Recomendados

1. **Total de peticiones bloqueadas** (429)
2. **Intentos de login fallidos** (401)
3. **Accesos denegados** (403)
4. **Usuarios bloqueados por brute force**
5. **Patrones de ataque detectados**
6. **Top usuarios/IPs por peticiones**

---

## 📈 Escalabilidad Futura

### Migración a Redis

```javascript
// Implementar para múltiples servidores
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});

class RedisRateLimitStore {
  async increment(key, windowMs) {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, Math.ceil(windowMs / 1000));
    }
    return count;
  }
}
```

### Consideraciones de Producción

- [ ] Migrar a Redis para sincronización distribuida
- [ ] Implementar WAF (Web Application Firewall)
- [ ] Usar CDN para rate limiting en edge
- [ ] Configurar alertas en tiempo real
- [ ] Mantener logs auditables
- [ ] Realizar auditorías de seguridad periódicas
- [ ] Usar HTTPS obligatorio
- [ ] Configurar certificados SSL/TLS

---

## 📞 Soporte y Troubleshooting

### Problemas Comunes

**Problema: "Demasiadas solicitudes (429)"**
- Esperar el tiempo indicado en `Retry-After`
- Reducir la frecuencia de peticiones
- Usar backoff exponencial

**Problema: "Token inválido"**
- Verificar que el token no esté expirado
- Usar formato: `Bearer <token>`
- Regenerar token con nuevo login

**Problema: "Acceso denegado (403)"**
- Verificar el rol del usuario
- Algunos endpoints requieren roles específicos
- Admin puede acceder a todo

**Problema: "Cuenta bloqueada"**
- Esperar 15 minutos
- Revisar logs: `[BRUTE FORCE DETECTED]`
- Contactar administrador si es frecuente

---

**Documento creado:** 2024-08-14  
**Última actualización:** 2024-08-14  
**Versión:** 1.0.0
