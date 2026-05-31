import crypto from "crypto";
import { conexion } from "../../db.js";

const P_CUST_ID_CLIENTE = process.env.EPAYCO_CUST_ID_CLIENTE || "1582802";
const P_KEY = process.env.EPAYCO_PRIVATE_KEY || "1f0de2d13952b5013d7ad5db469e933f";
const PUBLIC_KEY = process.env.EPAYCO_PUBLIC_KEY || "11aa6efbd445d3dfaff1a4d730583f61";

const normalizarId = (valor) => Number(valor);

const generarFirma = (ref, amount, currency = "COP") => {
    const cadena = `${P_CUST_ID_CLIENTE}^${P_KEY}^${ref}^${amount}^${currency}`;
    return crypto.createHash("md5").update(cadena).digest("hex");
};

const validarFirmaWebhook = (x_ref_payco, x_transaction_id, x_amount, x_currency, x_signature) => {
    const cadena = `${P_CUST_ID_CLIENTE}^${P_KEY}^${x_ref_payco}^${x_transaction_id}^${x_amount}^${x_currency}`;
    const firmaEsperada = crypto.createHash("md5").update(cadena).digest("hex");
    return firmaEsperada === x_signature;
};

const crearTransaccion = async (pedidoId) => {
    try {
        const pid = normalizarId(pedidoId);
        if (!pid) return { ok: false, message: "pedido inválido" };

        const [pedido] = await conexion.query(
            "SELECT id, total, estado FROM pedidos WHERE id = ? LIMIT 1",
            [pid]
        );

        if (pedido.length === 0) {
            return { ok: false, message: "pedido no encontrado" };
        }

        if (pedido[0].estado !== "pendiente") {
            return { ok: false, message: "el pedido ya fue procesado" };
        }

        const amount = Math.round(Number(pedido[0].total)).toString();
        const ref = `PEDIDO-${pid}-${Date.now()}`;
        const currency = "COP";
        const signature = generarFirma(ref, amount, currency);

        return {
            ok: true,
            transaccion: {
                public_key: PUBLIC_KEY,
                id_client: P_CUST_ID_CLIENTE,
                ref,
                amount,
                currency,
                signature,
                pedido_id: pid
            }
        };
    } catch (error) {
        console.error("Error en crearTransaccion:", error);
        return { ok: false, message: "error al crear transacción" };
    }
};

const confirmarPago = async (datos) => {
    try {
        const {
            x_ref_payco,
            x_transaction_id,
            x_id_factura: pedidoId,
            x_amount,
            x_currency,
            x_signature,
            x_response,
            x_response_reason_text,
            x_approval_code,
            x_fecha_transaccion
        } = datos;

        const pid = normalizarId(pedidoId);
        if (!pid) return { ok: false, message: "pedido inválido" };

        const firmaValida = validarFirmaWebhook(
            x_ref_payco, x_transaction_id, x_amount, x_currency, x_signature
        );

        if (!firmaValida) {
            console.error("Firma inválida en webhook de ePayco");
            return { ok: false, message: "firma inválida" };
        }

        const [pedido] = await conexion.query(
            "SELECT id, estado FROM pedidos WHERE id = ? LIMIT 1",
            [pid]
        );

        if (pedido.length === 0) {
            return { ok: false, message: "pedido no encontrado" };
        }

        await conexion.query(
            `INSERT INTO epayco (pedido_id, ref_payco, transaction_id, amount, currency, response, response_reason, approval_code, fecha_transaccion, signature)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                pid,
                x_ref_payco || null,
                x_transaction_id || null,
                x_amount || null,
                x_currency || null,
                x_response || null,
                x_response_reason_text || null,
                x_approval_code || null,
                x_fecha_transaccion || null,
                x_signature || null
            ]
        );

        if (x_response === "Aceptada") {
            await conexion.query(
                "UPDATE pedidos SET estado = 'pagado' WHERE id = ?",
                [pid]
            );

            await conexion.query(
                "UPDATE pago SET estado_pago = 'pagado', fecha_pago = NOW() WHERE id_pedido = ?",
                [pid]
            );

            console.log(`✅ Pago confirmado para pedido ${pid}, ref: ${x_ref_payco}`);

            return {
                ok: true,
                message: "pago confirmado",
                pedido_id: pid,
                ref_payco: x_ref_payco,
                codigo_aprobacion: x_approval_code
            };
        }

        await conexion.query(
            "UPDATE pago SET estado_pago = 'rechazado' WHERE id_pedido = ?",
            [pid]
        );

        console.log(`❌ Pago rechazado para pedido ${pid}: ${x_response_reason_text}`);

        return {
            ok: false,
            message: x_response_reason_text || "pago rechazado"
        };
    } catch (error) {
        console.error("Error en confirmarPago:", error);
        return { ok: false, message: "error al confirmar pago" };
    }
};

const obtenerPagoPorPedido = async (pedidoId) => {
    try {
        const pid = normalizarId(pedidoId);
        if (!pid) return { ok: false, message: "pedido inválido" };

        const [pago] = await conexion.query(
            `SELECT
                e.id_epayco,
                e.pedido_id,
                e.ref_payco,
                e.transaction_id,
                e.amount,
                e.currency,
                e.response,
                e.response_reason,
                e.approval_code,
                e.fecha_transaccion,
                e.created_at,
                p.total,
                p.estado AS pedido_estado
            FROM epayco e
            JOIN pedidos p ON e.pedido_id = p.id
            WHERE e.pedido_id = ?
            ORDER BY e.created_at DESC
            LIMIT 1`,
            [pid]
        );

        if (pago.length === 0) {
            return { ok: false, message: "no hay información de pago para este pedido" };
        }

        return { ok: true, pago: pago[0] };
    } catch (error) {
        console.error("Error en obtenerPagoPorPedido:", error);
        return { ok: false, message: "error al obtener información de pago" };
    }
};

export {
    crearTransaccion,
    confirmarPago,
    obtenerPagoPorPedido
};
