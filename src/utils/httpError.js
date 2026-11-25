/** Error con código HTTP que el manejador de errores devuelve tal cual al cliente. */
class HttpError extends Error {
  constructor(status, mensaje, detalles) {
    super(mensaje);
    this.status = status;
    this.detalles = detalles;
  }
}

module.exports = { HttpError };
