# ============================================
# Coolify Automated Deployment Script (PowerShell)
# ============================================
# Usage: .\deploy-coolify.ps1

param(
    [string]$CoolifyUrl = $env:COOLIFY_URL,
    [string]$ApiToken = $env:COOLIFY_API_TOKEN,
    [string]$GitRepo = $env:GIT_REPO_URL,
    [string]$GitBranch = "main",
    [string]$AppName = "newsletter-app",
    [string]$Domain = $env:DOMAIN
)

# Colors
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Cyan"

Write-Host "╔════════════════════════════════════════╗" -ForegroundColor $Blue
Write-Host "║   Coolify Automated Deployment        ║" -ForegroundColor $Blue
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor $Blue
Write-Host ""

# Validation
if ([string]::IsNullOrEmpty($CoolifyUrl)) {
    Write-Host "❌ Error: COOLIFY_URL not set" -ForegroundColor $Red
    Write-Host "Please set: `$env:COOLIFY_URL='https://your-coolify-url.com'" -ForegroundColor $Yellow
    exit 1
}

if ([string]::IsNullOrEmpty($ApiToken)) {
    Write-Host "❌ Error: COOLIFY_API_TOKEN not set" -ForegroundColor $Red
    Write-Host "Please set: `$env:COOLIFY_API_TOKEN='your-api-token'" -ForegroundColor $Yellow
    exit 1
}

if ([string]::IsNullOrEmpty($GitRepo)) {
    Write-Host "❌ Error: GIT_REPO_URL not set" -ForegroundColor $Red
    Write-Host "Please set: `$env:GIT_REPO_URL='https://github.com/user/repo.git'" -ForegroundColor $Yellow
    exit 1
}

Write-Host "✓ Configuration validated" -ForegroundColor $Green
Write-Host ""

# Read environment variables from .env.local
$envFile = Get-Content .env.local
$envVars = @{}
foreach ($line in $envFile) {
    if ($line -match '^([^#][^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        $envVars[$key] = $value
    }
}

# Build DATABASE_URL
$dbHost = $envVars['PGHOST']
$dbPort = $envVars['PGPORT']
$dbUser = $envVars['PGUSER']
$dbPassword = $envVars['PGPASSWORD']
$dbName = $envVars['PGDATABASE']
$databaseUrl = "postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?sslmode=disable"

# Prepare headers
$headers = @{
    "Authorization" = "Bearer $ApiToken"
    "Content-Type" = "application/json"
}

# Function to make API calls
function Invoke-CoolifyApi {
    param(
        [string]$Method,
        [string]$Endpoint,
        [object]$Body = $null
    )
    
    $url = "$CoolifyUrl/api/v1/$Endpoint"
    
    try {
        if ($Body) {
            $jsonBody = $Body | ConvertTo-Json -Depth 10
            return Invoke-RestMethod -Uri $url -Method $Method -Headers $headers -Body $jsonBody
        } else {
            return Invoke-RestMethod -Uri $url -Method $Method -Headers $headers
        }
    } catch {
        Write-Host "API Error: $_" -ForegroundColor $Red
        throw
    }
}

# Step 1: Connect to Coolify
Write-Host "📡 Step 1: Connecting to Coolify..." -ForegroundColor $Yellow
try {
    $servers = Invoke-CoolifyApi -Method GET -Endpoint "servers"
    Write-Host "✓ Connected to Coolify" -ForegroundColor $Green
    Write-Host ""
} catch {
    Write-Host "❌ Failed to connect to Coolify" -ForegroundColor $Red
    Write-Host "Please check your COOLIFY_URL and API token" -ForegroundColor $Yellow
    exit 1
}

# Step 2: Create application
Write-Host "🚀 Step 2: Creating application..." -ForegroundColor $Yellow

$environmentVariables = @{
    "DATABASE_URL" = $databaseUrl
    "PGHOST" = $dbHost
    "PGPORT" = $dbPort
    "PGUSER" = $dbUser
    "PGPASSWORD" = $dbPassword
    "PGDATABASE" = $dbName
    "ENCRYPTION_KEY" = $envVars['ENCRYPTION_KEY']
    "TRACKING_SECRET" = $envVars['TRACKING_SECRET']
    "NODE_ENV" = "production"
    "PORT" = "5000"
    "GEMINI_API_KEY" = $envVars['GEMINI_API_KEY']
    "AWS_REGION" = $envVars['AWS_REGION']
}

# Add optional AWS credentials
if ($envVars['AWS_ACCESS_KEY_ID']) {
    $environmentVariables['AWS_ACCESS_KEY_ID'] = $envVars['AWS_ACCESS_KEY_ID']
    $environmentVariables['AWS_SECRET_ACCESS_KEY'] = $envVars['AWS_SECRET_ACCESS_KEY']
}

$appPayload = @{
    name = $AppName
    git_repository = $GitRepo
    git_branch = $GitBranch
    build_pack = "dockerfile"
    port = 5000
    is_public = $true
    environment_variables = $environmentVariables
}

try {
    $appResponse = Invoke-CoolifyApi -Method POST -Endpoint "applications" -Body $appPayload
    $appUuid = $appResponse.uuid ?? $appResponse.id
    
    if ([string]::IsNullOrEmpty($appUuid)) {
        throw "No UUID returned from API"
    }
    
    Write-Host "✓ Application created: $appUuid" -ForegroundColor $Green
    Write-Host ""
} catch {
    Write-Host "❌ Failed to create application" -ForegroundColor $Red
    Write-Host $_.Exception.Message -ForegroundColor $Red
    exit 1
}

# Step 3: Configure domain (if provided)
if (![string]::IsNullOrEmpty($Domain)) {
    Write-Host "🌐 Step 3: Configuring domain..." -ForegroundColor $Yellow
    
    $domainPayload = @{
        domain = $Domain
        generate_ssl = $true
    }
    
    try {
        $domainResponse = Invoke-CoolifyApi -Method POST -Endpoint "applications/$appUuid/domains" -Body $domainPayload
        Write-Host "✓ Domain configured: $Domain" -ForegroundColor $Green
        Write-Host "ℹ️  Don't forget to point your DNS A record to: $dbHost" -ForegroundColor $Blue
        Write-Host ""
    } catch {
        Write-Host "⚠️  Warning: Could not configure domain automatically" -ForegroundColor $Yellow
        Write-Host "Please configure it manually in Coolify dashboard" -ForegroundColor $Yellow
        Write-Host ""
    }
}

# Step 4: Deploy application
Write-Host "🔨 Step 4: Starting deployment..." -ForegroundColor $Yellow
try {
    $deployResponse = Invoke-CoolifyApi -Method POST -Endpoint "applications/$appUuid/deploy" -Body @{}
    Write-Host "✓ Deployment started" -ForegroundColor $Green
    Write-Host ""
} catch {
    Write-Host "❌ Failed to start deployment" -ForegroundColor $Red
    exit 1
}

# Step 5: Monitor deployment
Write-Host "📊 Step 5: Monitoring deployment..." -ForegroundColor $Yellow
Write-Host "This may take 5-10 minutes..." -ForegroundColor $Blue
Write-Host ""

$maxAttempts = 60
$attempt = 0
$deploymentComplete = $false

while ($attempt -lt $maxAttempts) {
    Start-Sleep -Seconds 10
    
    try {
        $appStatus = Invoke-CoolifyApi -Method GET -Endpoint "applications/$appUuid"
        $status = $appStatus.status ?? "unknown"
        
        Write-Host "⏳ Checking status... ($($attempt + 1)/$maxAttempts) - Status: $status" -ForegroundColor $Blue
        
        if ($status -eq "running") {
            Write-Host ""
            Write-Host "✓ Deployment successful!" -ForegroundColor $Green
            $deploymentComplete = $true
            break
        } elseif ($status -eq "failed" -or $status -eq "error") {
            Write-Host ""
            Write-Host "❌ Deployment failed" -ForegroundColor $Red
            Write-Host "Check Coolify logs for details" -ForegroundColor $Yellow
            exit 1
        }
    } catch {
        Write-Host "⚠️  Could not check status" -ForegroundColor $Yellow
    }
    
    $attempt++
}

if (-not $deploymentComplete) {
    Write-Host ""
    Write-Host "⚠️  Deployment timeout - check Coolify dashboard" -ForegroundColor $Yellow
}

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor $Green
Write-Host "║     Deployment Complete! 🎉            ║" -ForegroundColor $Green
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor $Green
Write-Host ""
Write-Host "📝 Deployment Summary:" -ForegroundColor $Blue
Write-Host "   Application: $AppName"
Write-Host "   UUID: $appUuid"
if (![string]::IsNullOrEmpty($Domain)) {
    Write-Host "   URL: https://$Domain"
} else {
    Write-Host "   URL: Check Coolify dashboard for assigned URL"
}
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor $Yellow
Write-Host "   1. Wait for SSL certificate (2-5 minutes)"
Write-Host "   2. Visit your application URL"
Write-Host "   3. Create superadmin account or run: npm run db:seed"
Write-Host "   4. Change default passwords"
Write-Host ""
Write-Host "🔗 Useful Links:" -ForegroundColor $Blue
Write-Host "   Coolify Dashboard: $CoolifyUrl"
Write-Host "   Application Logs: $CoolifyUrl/applications/$appUuid/logs"
if (![string]::IsNullOrEmpty($Domain)) {
    Write-Host "   Health Check: https://$Domain/api/health"
}
Write-Host ""
