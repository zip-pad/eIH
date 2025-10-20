const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
    let error = {
        message: err.message || 'Internal Server Error',
        status: err.status || 500
    };
    res.status(error.status).json({
        success: false,
        error: error.message
    });
};
module.exports = errorHandler;