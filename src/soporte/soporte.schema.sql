CREATE TABLE IF NOT EXISTS tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    asunto VARCHAR(255) NOT NULL,
    mensaje TEXT NOT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'abierto',
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tickets_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS ticket_adjuntos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    archivo VARCHAR(255) NOT NULL,
    CONSTRAINT fk_ticket_adjuntos_ticket
        FOREIGN KEY (ticket_id) REFERENCES tickets(id)
        ON DELETE CASCADE
);
