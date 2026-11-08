"use strict";
const session = require("express-session");

// PostgreSQL-backed session store for a single-instance or multi-instance Node server.
// Requires server/sql/final-v1-setup.sql. Prevents production session loss on restart.
class PostgresSessionStore extends session.Store {
  constructor(pool) {
    super();
    this.pool = pool;
    this.writes = 0;
  }
  expiry(data) {
    const value = data?.cookie?.expires;
    const expiration = value ? new Date(value) : new Date(Date.now()+14*24*60*60*1000);
    return Number.isNaN(expiration.getTime()) ? new Date(Date.now()+14*24*60*60*1000) : expiration;
  }
  get(sid, callback) {
    this.pool.query("SELECT sess FROM pult_sessions WHERE sid=$1 AND expires_at>NOW()",[sid])
      .then(result=>callback(null,result.rows[0]?.sess||null))
      .catch(error=>callback(error));
  }
  set(sid, data, callback=()=>{}) {
    this.pool.query(
      "INSERT INTO pult_sessions(sid,sess,expires_at) VALUES($1,$2::jsonb,$3) ON CONFLICT(sid) DO UPDATE SET sess=EXCLUDED.sess,expires_at=EXCLUDED.expires_at",
      [sid,JSON.stringify(data),this.expiry(data)]
    ).then(async()=>{
      this.writes++;
      if(this.writes%100===0)await this.pool.query("DELETE FROM pult_sessions WHERE expires_at<NOW()");
      callback(null);
    }).catch(callback);
  }
  touch(sid, data, callback=()=>{}) {
    this.pool.query("UPDATE pult_sessions SET expires_at=$2 WHERE sid=$1",
      [sid,this.expiry(data)]).then(()=>callback(null)).catch(callback);
  }
  destroy(sid, callback=()=>{}) {
    this.pool.query("DELETE FROM pult_sessions WHERE sid=$1",[sid])
      .then(()=>callback(null)).catch(callback);
  }
  clear(callback=()=>{}) {
    this.pool.query("DELETE FROM pult_sessions").then(()=>callback(null)).catch(callback);
  }
}
module.exports=PostgresSessionStore;
