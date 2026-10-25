"use strict";

/** Pure validators and formatting shared by routes and isolated tests. */
const STATUSES = Object.freeze(["not_sent","registered","in_transit","at_branch","received","cancelled"]);
const DIRECTIONS = Object.freeze(["incoming","outgoing"]);

function stringField(value, maxLength) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string" || value.length > maxLength * 2) return null;
  const result = value.trim();
  return result.length <= maxLength ? result : null;
}
function isTtn(value) { return typeof value === "string" && /^[0-9]{14}$/.test(value); }
function parseShipment(body, direction) {
  if (!body || typeof body !== "object" || Array.isArray(body) || !DIRECTIONS.includes(direction)) return null;
  const status = body.status || "not_sent";
  const tracking_number = stringField(body.tracking_number, 14);
  const city = stringField(body.city, 120);
  const warehouse = stringField(body.warehouse, 180);
  const recipient_name = stringField(body.recipient_name, 120);
  const recipient_phone = stringField(body.recipient_phone, 30);
  if ([tracking_number,city,warehouse,recipient_name,recipient_phone].some(x=>x===null)) return null;
  if (!STATUSES.includes(status)) return null;
  if (tracking_number && !isTtn(tracking_number)) return null;
  if (!tracking_number && !["not_sent","cancelled"].includes(status)) return null;
  if (tracking_number && status === "not_sent") return null;
  if (direction === "outgoing" && status !== "not_sent" && status !== "cancelled" && (!city || !warehouse || !recipient_name || !recipient_phone)) return null;
  return { status,tracking_number:tracking_number || null,city,warehouse,recipient_name,recipient_phone };
}
function parseRecipient(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const full_name = stringField(body.full_name,120);
  const phone = stringField(body.phone,30);
  const city = stringField(body.city,120);
  const warehouse = stringField(body.warehouse,180);
  return [full_name,phone,city,warehouse].some(x=>x===null) ? null : {full_name,phone,city,warehouse};
}
function parseReturnPreference(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const return_city=stringField(body.return_city,120);
  const return_warehouse=stringField(body.return_warehouse,180);
  if (!return_city || !return_warehouse) return null;
  return {return_city,return_warehouse};
}
function parseIntake(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const external_condition=stringField(body.external_condition,1000);
  const accessories=stringField(body.accessories,1000);
  const serial_number=stringField(body.serial_number,120);
  const notes=stringField(body.notes,1000);
  if (!external_condition || !accessories || serial_number===null || notes===null) return null;
  return {external_condition,accessories,serial_number,notes};
}
function numericId(value) {
  const id=Number(value);
  return Number.isSafeInteger(id)&&id>0 ? id : null;
}
module.exports={STATUSES,DIRECTIONS,stringField,isTtn,parseShipment,parseRecipient,parseReturnPreference,parseIntake,numericId};
