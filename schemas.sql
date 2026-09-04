CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    nombre VARCHAR(100) NOT NULL,

    email VARCHAR(255) NOT NULL UNIQUE,

    password VARCHAR(255) NOT NULL,

    rol VARCHAR(20) NOT NULL
        CHECK (rol IN ('alumno', 'profesor')),

    created_at TIMESTAMP DEFAULT NOW(),

    updated_at TIMESTAMP DEFAULT NOW(),

    deleted_at TIMESTAMP NULL
);

CREATE TABLE materias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    nombre VARCHAR(100) NOT NULL,

    profesor_id UUID NOT NULL,

    created_at TIMESTAMP DEFAULT NOW(),

    updated_at TIMESTAMP DEFAULT NOW(),

    deleted_at TIMESTAMP NULL,

    CONSTRAINT fk_materia_profesor
        FOREIGN KEY (profesor_id)
        REFERENCES usuarios(id)
);

CREATE TABLE alumno_materia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    alumno_id UUID NOT NULL,

    materia_id UUID NOT NULL,

    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_alumno
        FOREIGN KEY (alumno_id)
        REFERENCES usuarios(id),

    CONSTRAINT fk_materia
        FOREIGN KEY (materia_id)
        REFERENCES materias(id),

    CONSTRAINT unique_inscripcion
        UNIQUE(alumno_id, materia_id)
);