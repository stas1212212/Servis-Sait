const pool = require('../db');
module.exports = async function sessionVersion(req,res,next) {
  const user = req.session?.user;
  if (!user?.id || ['/auth/login','/auth/register','/auth/logout'].includes(req.path)
      || req.path.startsWith('/experience/password/')) return next();
  try {
    const row = await pool.query('SELECT auth_version FROM users WHERE id=$1',[user.id]);
    if (!row.rowCount || row.rows[0].auth_version !== user.auth_version) {
      req.session.destroy(() => {});
      if (req.method === 'GET' && ['/experience/settings','/experience/reviews'].includes(req.path)) return next();
      return res.status(401).json({message:'Сеанс завершився. Увійдіть знову.'});
    }
    return next();
  } catch(e) {
    console.error('Session version error:', e);
    return res.status(503).json({message:'Сервіс тимчасово недоступний'});
  }
};