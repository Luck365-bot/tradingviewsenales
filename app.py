from flask import Flask, request
from flask_socketio import SocketIO

app = Flask(__name__)
socketio = SocketIO(app)

# Endpoint para recibir alertas de TradingView
@app.route('/webhook', methods=['POST'])
def webhook():
    data = request.json  # Datos de la alerta
    signal = data.get('message')  # Obtener la señal (alcista o bajista)

    if signal in ['alcista', 'bajista']:
        socketio.emit('signal', signal)  # Enviar señal a los clientes
        return 'Señal recibida', 200
    else:
        return 'Señal no válida', 400

# Iniciar el servidor
if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)
