export function validateEnvironment() {
    const errors = [];
    const warnings = [];
    const isProduction = process.env.NODE_ENV === 'production';
    if (!process.env.DATABASE_URL) {
        errors.push('DATABASE_URL is required but not set');
    }
    if (isProduction) {
        if (!process.env.ENCRYPTION_KEY) {
            errors.push('ENCRYPTION_KEY is required in production for encrypting AWS SES credentials. ' +
                'Generate one using: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"');
        }
        else if (process.env.ENCRYPTION_KEY.length < 32) {
            errors.push('ENCRYPTION_KEY must be at least 32 characters long for security');
        }
        if (!process.env.TRACKING_SECRET) {
            errors.push('TRACKING_SECRET is required in production for validating tracking tokens. ' +
                'Generate one using: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
        }
    }
    else {
        if (!process.env.ENCRYPTION_KEY) {
            warnings.push('ENCRYPTION_KEY not set. A temporary key will be generated for development. ' +
                'Set ENCRYPTION_KEY in production to persist encrypted credentials across restarts.');
        }
        if (!process.env.TRACKING_SECRET) {
            warnings.push('TRACKING_SECRET not set. A random secret will be generated for development. ' +
                'Set TRACKING_SECRET in production for persistent tracking token validation.');
        }
    }
    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}
export function enforceEnvironment() {
    const result = validateEnvironment();
    if (result.warnings.length > 0) {
        console.warn('\n⚠️  Environment Warnings:');
        result.warnings.forEach(warning => {
            console.warn(`   - ${warning}`);
        });
        console.warn('');
    }
    if (!result.valid) {
        console.error('\n❌ Environment Validation Failed:');
        result.errors.forEach(error => {
            console.error(`   - ${error}`);
        });
        console.error('\nPlease set the required environment variables and restart the application.\n');
        process.exit(1);
    }
    if (result.warnings.length === 0 && result.valid) {
        console.log('✅ Environment validation passed');
    }
}
export function getEnvironmentConfig() {
    enforceEnvironment();
    return {
        DATABASE_URL: process.env.DATABASE_URL,
        ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
        TRACKING_SECRET: process.env.TRACKING_SECRET,
        NODE_ENV: process.env.NODE_ENV || 'development',
    };
}
