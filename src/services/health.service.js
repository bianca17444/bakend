export const getHealthStatus = async () => {
  return {
    status: "OK",
    message: "API funcionando correctamente",
    timestamp: new Date().toISOString()
  };
};