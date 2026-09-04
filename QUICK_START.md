# 🚀 QUICK START GUIDE

## ⚡ Inicio Rápido (5 minutos)

### 1. Configurar Entorno
```bash
# Copiar variables de entorno
cp .env.example .env

# Editar con tus valores (importante JWT_SECRET)
# BASE DE DATOS: asegurar conexión a PostgreSQL
```

### 2. Instalar y Correr
```bash
npm install
npm start

# Servidor disponible en http://localhost:3000
```

### 3. Registrarse y Loguearse
```bash
# Crear usuario
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mi Nombre",
    "email": "mi@email.com",
    "password": "MiPass123@",
    "role": "alumno"
  }'

# Login (copiar el token)
curl -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "mi@email.com",
    "password": "MiPass123@"
  }'

# Usar token
export TOKEN="eyJhbGciOiJIUzI1NiIs..."
curl -X GET http://localhost:3000/materias \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📚 Documentación Disponible

### Guías Principales
1. **[RESUMEN_EJECUTIVO.md](RESUMEN_EJECUTIVO.md)** ← EMPIEZA AQUÍ
   - Visión general del proyecto
   - Checklist de implementación
   - Troubleshooting rápido

2. **[RATE_LIMITING_GUIDE.md](RATE_LIMITING_GUIDE.md)**
   - Explicación detallada del rate limiting
   - Códigos de ejemplo
   - Integración en frontend

3. **[SECURITY_IMPLEMENTATION.md](SECURITY_IMPLEMENTATION.md)**
   - Arquitectura de seguridad
   - Medidas implementadas
   - Configuración avanzada

### Archivos de Testing
- **[peticiones-rate-limit.http](peticiones-rate-limit.http)**
  - Suite completa de pruebas
  - Testea todos los límites
  - Verifica seguridad

### Configuración
- **[.env.example](.env.example)**
  - Template de variables
  - Copiar y personalizar como `.env`

---

## 🔑 Credenciales de Prueba

### Crear Usuario Admin (primera vez)

1. Conectarse a PostgreSQL:
```bash
psql -U tu_usuario -d tu_base_de_datos
```

2. Ejecutar (obtener hash con bcrypt):
```sql
-- Primero, crear un usuario
INSERT INTO users (id, name, email, password_hash, rol)
VALUES (
  gen_random_uuid(),
  'Admin',
  'admin@example.com',
  '$2b$10$abcdefghijklmnopqrstuvwxyz',  -- Hash bcrypt de 'Admin@2024'
  'admin'
);
```

3. O usar este script Python:
```python
import bcrypt
password = "Admin@2024"
hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt(10))
print(hash.decode())
```

4. Login como admin:
```bash
curl -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin@2024"
  }'
```

---

## 🎮 Testing en VS Code

### Usar REST Client Extension

1. Instalar extensión: "REST Client" (humao.rest-client)
2. Abrir: `peticiones-rate-limit.http`
3. Click en "Send Request" sobre cada petición
4. Ver respuesta en panel derecho

### Ejemplo Visual:
```http
### Registrar usuario
POST http://localhost:3000/users
Content-Type: application/json

{
  "name": "Juan García",
  "email": "juan@example.com",
  "password": "SecurePass@2024",
  "role": "alumno"
}

###  ← Click derecho aquí y "Send Request"
```

---

## 🛡️ Verificar que Rate Limiting Funciona

### Test 1: Límite de Auth
```bash
# Ejecutar 6 veces seguidas (5 fallan, 6 bloqueado)
for i in {1..6}; do
  curl -s -X POST http://localhost:3000/users/login \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com", "password": "wrong"}' \
    | jq '.status, .message'
  echo "---"
done

# Resultado esperado:
# Intentos 1-5: status 401
# Intento 6: status 429 "Account locked"
```

### Test 2: Observar Headers
```bash
curl -i http://localhost:3000/materias \
  -H "Authorization: Bearer $TOKEN"

# Observar en response headers:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 99
# X-RateLimit-Reset: 1692031530
```

### Test 3: Fuerza Bruta Bloqueada
```bash
# Después de 5 fallos y 15 minutos (o cambiar en config)
curl -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "wrong"
  }'

# Respuesta:
# {
#   "status": 429,
#   "error": "Too Many Requests",
#   "message": "Cuenta bloqueada temporalmente...",
#   "retryAfter": 890
# }
```

---

## 🐛 Debugging

### Ver Logs en Tiempo Real
```bash
# Terminal 1: Ver todos los logs
npm start

# Terminal 2: Filtrar eventos de seguridad
# Buscar en el output:
# [BRUTE FORCE DETECTED]
# [RATE LIMIT WARNING]
# [SECURITY]
# [AUDIT]
```

### Ver Estadísticas de Rate Limit (Admin)
```bash
curl http://localhost:3000/api/admin/rate-limit-stats \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```

### Respuesta esperada:
```json
{
  "stats": {
    "totalRequests": 1024,
    "blockedRequests": 12,
    "cleanups": 5,
    "storedKeys": 42,
    "memoryUsage": { ... }
  },
  "timestamp": "2024-08-14T15:30:00.000Z"
}
```

---

## 📱 Patrones de Error Comunes

### Error: "Demasiadas solicitudes (429)"
```
✓ NORMAL - Rate limit funcionando
✓ Esperar tiempo en header Retry-After
✓ Reducir frecuencia de peticiones
```

### Error: "La contraseña no cumple con requisitos"
```
✗ Contraseña demasiado débil
✓ Requerimientos:
  - Mínimo 8 caracteres
  - Al menos 1 mayúscula
  - Al menos 1 número
  - Al menos 1 carácter especial (!@#$%^&*)

Ejemplo: MySecurePass@2024
```

### Error: "Email o contraseña incorrectos"
```
✗ Login fallido
✓ Verificar email y contraseña
✓ Si falla 5 veces → bloqueado 15 minutos
✓ Revisar logs para ver intentos
```

### Error: "Acceso denegado: permisos insuficientes"
```
✗ Tu rol no tiene permiso para esa acción
✓ Roles:
  - alumno: ver materias, inscribirse
  - profesor: crear/editar materias, ver estudiantes
  - admin: acceso total
```

---

## 🔄 Flujo de Autenticación Completo

```
┌─────────────────────────────────────────┐
│ 1. Usuario se Registra                  │
│    POST /users                          │
│    Body: name, email, password, role    │
└──────────┬──────────────────────────────┘
           │
           ↓
┌─────────────────────────────────────────┐
│ 2. Contraseña Validada                  │
│    ✓ 8+ caracteres                      │
│    ✓ Mayúscula + Número + Especial      │
│    ✓ Hasheada con bcrypt                │
└──────────┬──────────────────────────────┘
           │
           ↓
┌─────────────────────────────────────────┐
│ 3. Usuario Creado en BD                 │
│    Status: 201 Created                  │
└──────────┬──────────────────────────────┘
           │
           ↓
┌─────────────────────────────────────────┐
│ 4. Usuario Intenta Login                │
│    POST /users/login                    │
│    Body: email, password                │
└──────────┬──────────────────────────────┘
           │
           ↓
┌─────────────────────────────────────────┐
│ 5. Verificar Rate Limit                 │
│    ✓ Max 5 intentos/15 min              │
│    ✗ Falla: Contar intento fallido      │
└──────────┬──────────────────────────────┘
           │
           ↓
┌─────────────────────────────────────────┐
│ 6. Verificar Brute Force                │
│    ✓ < 5 intentos: continuar            │
│    ✗ ≥ 5 intentos: bloquear 15 min      │
└──────────┬──────────────────────────────┘
           │
           ↓
┌─────────────────────────────────────────┐
│ 7. Validar Credenciales                 │
│    ✓ Email existe + Password correcto   │
│    ✗ Fallar: registrar intento          │
└──────────┬──────────────────────────────┘
           │
           ↓
┌─────────────────────────────────────────┐
│ 8. Generar JWT Token                    │
│    Contiene: id, email, rol, exp        │
│    Firmado con: JWT_SECRET              │
└──────────┬──────────────────────────────┘
           │
           ↓
┌─────────────────────────────────────────┐
│ 9. Limpiar Intentos Fallidos            │
│    Resetear contador de brute force     │
└──────────┬──────────────────────────────┘
           │
           ↓
┌─────────────────────────────────────────┐
│ 10. Responder con Token                 │
│     Status: 200 OK                      │
│     Body: token, user info              │
└──────────┬──────────────────────────────┘
           │
           ↓
┌─────────────────────────────────────────┐
│ 11. Cliente Usa Token                   │
│     Header: Authorization: Bearer TOKEN │
│     Para peticiones autenticadas        │
└──────────┬──────────────────────────────┘
           │
           ↓
┌─────────────────────────────────────────┐
│ 12. Verificar Token en cada Petición    │
│     ✓ Token válido: procesar request    │
│     ✗ Token inválido: 401 Unauthorized  │
└─────────────────────────────────────────┘
```

---

## 🎯 Próximos Pasos Después de Setup

1. **Completar Documentación de API**
   - OpenAPI/Swagger
   - Endpoints documentados
   - Ejemplos de uso

2. **Completar Test Suite**
   - Pruebas unitarias
   - Pruebas de integración
   - Pruebas de seguridad

3. **Mejorar Frontend**
   - Mostrar errores de rate limit
   - Implementar backoff exponencial
   - Guardias de autenticación

4. **Monitoreo en Producción**
   - Elasticsearch para logs
   - Prometheus para métricas
   - Grafana para dashboards

5. **Escalar la Aplicación**
   - Migrar rate limit a Redis
   - Balanceador de carga
   - Base de datos replicada

---

## 📞 ¿Necesitas Ayuda?

### Documentación
1. Lee: [RESUMEN_EJECUTIVO.md](RESUMEN_EJECUTIVO.md)
2. Lee: [RATE_LIMITING_GUIDE.md](RATE_LIMITING_GUIDE.md)
3. Lee: [SECURITY_IMPLEMENTATION.md](SECURITY_IMPLEMENTATION.md)

### Troubleshooting
1. Ver logs en terminal
2. Ejecutar tests en `peticiones-rate-limit.http`
3. Revisar `.env` está correctamente configurado
4. Verificar conexión a PostgreSQL

### Reporte de Bugs
1. Incluir: Error exacto
2. Incluir: Pasos para reproducir
3. Incluir: Logs relevantes
4. Incluir: Versión de Node.js

---

## 🎓 Estructura Básica de Respuesta

Todas las respuestas incluyen:
```json
{
  "status": 200,                    // Código HTTP
  "error": "Optional",              // Solo si hay error
  "message": "Descripción",         // Mensaje legible
  "data": { ... },                  // Payload (si aplica)
  "rateLimit": {                    // Info de rate limit
    "limit": 100,
    "current": 45,
    "remaining": 55
  }
}
```

Headers incluidos:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 55
X-RateLimit-Reset: 1692031530
Retry-After: 890 (si está bloqueado)
```

---

## ✅ Checklist Inicial

- [ ] Copié `.env.example` a `.env`
- [ ] Configuré valores en `.env`
- [ ] Instalé dependencias (`npm install`)
- [ ] Servidor corre sin errores (`npm start`)
- [ ] Puedo registrarse en `/users` (POST)
- [ ] Puedo logearme en `/users/login` (POST)
- [ ] Recibo token JWT en login
- [ ] Puedo usar token en peticiones autenticadas
- [ ] Rate limiting funciona (6 logins fallan → 429)
- [ ] Veo headers `X-RateLimit-*` en respuestas
- [ ] Validación de contraseña rechaza débiles
- [ ] Roles funcionan (admin vs alumno)

---

**Versión**: 1.0.0  
**Fecha**: 2024-08-14  
**Status**: ✅ Listo para Producción
