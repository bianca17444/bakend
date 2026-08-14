# Guía de Rate Limiting y Seguridad

## 📊 Resumen del Rate Limiting

El sistema implementa **rate limiting multinivel** para proteger la API contra abuso, spam y ataques de fuerza bruta.

### Estrategia de Limitación

#### 1. **Autenticación (Auth Limiter)** 🔐
- **Endpoints**: `POST /users/login`, `POST /users` (registro)
- **Límite**: 5 peticiones por 15 minutos
- **Identificación**: IP o ID de usuario (si está autenticado)
- **Propósito**: Prevenir ataques de fuerza bruta contra credenciales

**Respuesta cuando se excede**:
```json
{
  "status": 429,
  "error": "Too Many Requests",
  "message": "Demasiados intentos. Por favor, intente de nuevo en 890 segundos.",
  "retryAfter": 890,
  "resetTime": "2024-08-14T15:45:30.000Z"
}
```

#### 2. **Lectura (Read Limiter)** 📖
- **Endpoints**: `GET /users`, `GET /materias`, etc.
- **Límites por rol**:
  - Admin: 500 peticiones/minuto
  - Profesor: 200 peticiones/minuto
  - Alumno: 100 peticiones/minuto
  - No autenticado: 20 peticiones/5 minutos
- **Propósito**: Evitar sobrecarga del servidor con consultas masivas

#### 3. **Escritura (Write Limiter)** ✍️
- **Endpoints**: `POST /materias`, `PUT /usuarios/:id`, etc.
- **Límites por rol**:
  - Admin: 150 operaciones/minuto
  - Profesor: 60 operaciones/minuto
  - Alumno: 20 operaciones/minuto
- **Propósito**: Proteger integridad de datos, evitar creación masiva de registros

#### 4. **Eliminación (Delete Limiter)** 🗑️
- **Endpoints**: `DELETE /usuarios/:id`, `DELETE /materias/:id`
- **Límites por rol**:
  - Admin: 50 eliminaciones/5 minutos
  - Profesor: 20 eliminaciones/5 minutos
  - Alumno: 5 eliminaciones/5 minutos
- **Propósito**: Protección máxima contra borrado accidental o malicioso

#### 5. **Endpoints Públicos (Public Limiter)** 🌐
- **Endpoints**: Cualquiera sin autenticación
- **Límite**: 20 peticiones por 5 minutos
- **Propósito**: Proteger endpoints públicos contra abuso

### Headers de Rate Limit

Toda respuesta incluye headers estándar RFC 6585:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1692031530
Retry-After: 890
```

- `X-RateLimit-Limit`: Límite máximo de peticiones
- `X-RateLimit-Remaining`: Peticiones restantes en la ventana actual
- `X-RateLimit-Reset`: Timestamp UNIX cuando se resetea el límite
- `Retry-After`: Segundos para esperar antes de reintentar

## 🔒 Medidas de Seguridad Adicionales

### 1. **Protección contra Fuerza Bruta**
- Límite de 5 intentos de login fallidos en 15 minutos
- Bloqueo temporal de 15 minutos después de exceder el límite
- Registra intentos en logs de seguridad

### 2. **Validación de Contraseñas**
- Mínimo 8 caracteres
- Mínimo 1 mayúscula
- Mínimo 1 número
- Mínimo 1 carácter especial

```javascript
// Ejemplo de contraseña válida
validPassword = "MyPass@2024"
```

### 3. **Headers de Seguridad HTTP**
- **X-Content-Type-Options**: nosniff (previene MIME-sniffing)
- **X-Frame-Options**: DENY (previene clickjacking)
- **X-XSS-Protection**: 1; mode=block (protección XSS)
- **Content-Security-Policy**: default-src 'self' (CSP)
- **Strict-Transport-Security**: HTTPS solo (en producción)

### 4. **Prevención de Ataques Comunes**

#### SQL Injection
- Sanitización de entrada en todos los parámetros
- Queries parametrizadas en la base de datos
- Detección de patrones de SQL injection

#### XSS (Cross-Site Scripting)
- Sanitización de caracteres peligrosos (`<`, `>`, `"`, `'`, backticks)
- Headers CSP restrictivos
- Validación de contenido

#### CSRF (Cross-Site Request Forgery)
- Validación de tokens CSRF en cambios de estado
- Validación de Content-Type
- Verificación de origen

### 5. **Autenticación Segura**
- Tokens JWT con expiración
- Contraseñas hasheadas con bcrypt (salt rounds: 10)
- Tokens no exponen información sensible
- Prevención de user enumeration en login

### 6. **Autorización Basada en Roles**

```
Roles disponibles:
├── alumno (estudiante)
│   ├── Ver propias materias
│   ├── Ver propios calificaciones
│   └── Actualizar propio perfil
├── profesor
│   ├── Ver todas las materias
│   ├── Crear/editar materias
│   ├── Ver estudiantes inscritos
│   └── Calificar estudiantes
└── admin
    ├── Acceso total
    ├── Gestionar usuarios
    ├── Ver estadísticas
    └── Acceder a rate limit stats
```

### 7. **Validación de Entrada**
- Email: formato válido RFC 5322
- Nombre: 2-100 caracteres, solo letras y espacios
- ID: UUID válido
- Tipo de contenido: application/json requerido

## 📊 Monitoreo y Estadísticas

### Endpoint de Estadísticas (Solo Admin)
```
GET /api/admin/rate-limit-stats
Authorization: Bearer <admin_token>

Respuesta:
{
  "stats": {
    "totalRequests": 1024,
    "blockedRequests": 12,
    "cleanups": 5,
    "storedKeys": 342,
    "memoryUsage": { ... }
  },
  "timestamp": "2024-08-14T15:30:00.000Z"
}
```

## 🚀 Mejores Prácticas de Uso

### Para Desarrolladores Frontend

#### 1. Manejar Errores 429
```javascript
async function apiCall(url, options) {
  const response = await fetch(url, options);
  
  if (response.status === 429) {
    const data = await response.json();
    const retryAfter = data.retryAfter;
    
    // Esperar antes de reintentar
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    return apiCall(url, options); // Reintentar
  }
  
  return response;
}
```

#### 2. Usar Headers para Optimizar
```javascript
const response = await fetch('/api/users', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// Leer headers de rate limit
const limit = response.headers.get('X-RateLimit-Limit');
const remaining = response.headers.get('X-RateLimit-Remaining');
const reset = response.headers.get('X-RateLimit-Reset');

console.log(`Peticiones restantes: ${remaining}/${limit}`);
```

#### 3. Implementar Backoff Exponencial
```javascript
async function callWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      
      if (response.status === 429) {
        const delay = Math.pow(2, i) * 1000; // Backoff exponencial
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
}
```

### Para Administradores

1. **Monitorear logs de seguridad**
   ```bash
   tail -f logs/security.log | grep "BRUTE FORCE"
   ```

2. **Verificar estadísticas de rate limit**
   ```bash
   curl -H "Authorization: Bearer <admin_token>" \
     http://localhost:3000/api/admin/rate-limit-stats
   ```

3. **Ajustar límites según necesidad**
   - Editar configuración en `src/config/rateLimit.config.js`
   - Reiniciar la aplicación

## 📈 Escalabilidad

### Almacenamiento Local (Desarrollo)
- Usa Map de JavaScript en memoria
- Válido para aplicaciones de un solo servidor
- Limpieza automática cada 5 minutos

### Producción (Recomendado)
Para aplicaciones distribuidas, migrar a Redis:

```javascript
// Ejemplo (no incluido por defecto)
import Redis from 'ioredis';

const redis = new Redis();

// Reemplazar limitStore con adapter Redis
```

## 🔍 Detección de Ataques

El sistema detecta y bloquea automáticamente:

1. **Intentos de fuerza bruta**: Múltiples logins fallidos
2. **SQL Injection**: Patrones SQL en requests
3. **XSS**: Scripts maliciosos en parámetros
4. **Rate limit abuse**: Exceso de peticiones
5. **User enumeration**: Respuestas inconsistentes en login

Todos los eventos se registran en logs para auditoría.

## 📝 Logging de Seguridad

La aplicación registra:
- Intentos de login fallidos
- Accesos bloqueados (401, 403, 429)
- Operaciones sensibles (DELETE, PUT)
- Patrones de ataque detectados
- Cambios de usuario

```
[BRUTE FORCE DETECTED] Account user@example.com locked
[SECURITY] 192.168.1.100 user123 - POST /users - Status: 401
[AUDIT] 192.168.1.100 user456 - DELETE /users/123 - Status: 200
```

## ⚙️ Configuración Personalizada

Para cambiar límites específicos, editar `src/config/rateLimit.config.js`:

```javascript
auth: {
  windowMs: 15 * 60 * 1000,  // 15 minutos
  max: 5,                     // 5 intentos
  message: "Mensaje personalizado"
}
```

## ✅ Checklist de Seguridad en Producción

- [ ] Cambiar `JWT_SECRET` a valor fuerte
- [ ] Configurar `CORS_ORIGIN` correctamente
- [ ] Usar HTTPS (activa HSTS)
- [ ] Configurar variables de entorno en servidor
- [ ] Monitorear logs regularmente
- [ ] Realizar auditorías de seguridad
- [ ] Mantener dependencias actualizadas
- [ ] Implementar backup de base de datos
- [ ] Usar rate limiting distribuido (Redis)
- [ ] Implementar WAF (Web Application Firewall)
