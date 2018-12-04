addEventListener('fetch', event => {
  event.respondWith(handleRequest(event))
})

const apiHostname = 'kvexplorerapi.YOURURL.com'

const cloudflareApiHeader = new Headers({
  'X-Auth-Email': '<YOUR EMAIL>',
  'X-Auth-Key': '<YOUR AUTH KEY>',
  'Content-Type': 'application/json',
})

function setCorsHeaders(headers) {
    headers.set('Access-Control-Allow-Origin', 'kvexplorer.YOURURL.com') // Replace this with * if you want to use it for local dev
    headers.set('Access-Control-Allow-Methods', 'GET')
    headers.set('Access-Control-Allow-Headers', 'access-control-allow-headers')
    headers.set('Access-Control-Max-Age', 1728000)
    return headers
}

/**
 * Gets a list of all the namespaces
 * @param {*} corsHeaders 
 */
async function getNamespaces(corsHeaders) {
  const request = new Request('https://api.cloudflare.com/client/v4/accounts/YOURACCOUNT/storage/kv/namespaces', {
    headers: cloudflareApiHeader
  })
  const response = await fetch(request)
  const responseBody = await response.json()

  if (responseBody.success == true) {
    console.log('Returned Namespaces')
    return new Response(JSON.stringify(responseBody.result), { status: 200, headers:corsHeaders })
  } else {
    console.log('Error returning Namespaces')
    return new Response('Namespace listing failed', { status: 400, headers:corsHeaders })
  }
}

/**
 * Get a list of all the keys for a particular page (as well as their value), for a particular namespace. 
 * @param {URL} requestUrl 
 * @param {Object} corsHeaders 
 */
async function getKeys(requestUrl, corsHeaders) {
  const namespace = requestUrl.searchParams.get('namespace')
  const page = requestUrl.searchParams.get('page')

  if (!page || !namespace) {
    return new Response('Invalid parameters', { status: 400, headers:corsHeaders })
  }

  const request = new Request(`https://api.cloudflare.com/client/v4/accounts/YOURACCOUNT/workers/namespaces/${namespace}/keys?page=${page}`, {
    headers: cloudflareApiHeader
  })
  const response = await fetch(request)
  const responseBody = await response.json()

  if (responseBody.success == true) {
    console.log(`Returned keys for page ${page}`)
    return new Response(JSON.stringify(responseBody), { status: 200, headers:corsHeaders })
  } else {
    console.log(`Error returning keys for page ${page}`)
    return new Response(`Error returning keys for page ${page}`, { status: 400, headers:corsHeaders })
  }
}

/**
 * Get a specific key
 * @param {URL} requestUrl 
 * @param {Object} corsHeaders 
 */
async function getKeyValue(requestUrl, corsHeaders) {
  const namespace = requestUrl.searchParams.get('namespace')
  const key = requestUrl.searchParams.get('key')

  if (!namespace || !key) {
    return new Response('Invalid parameters', { status: 400, headers:corsHeaders })
  }

  const request = new Request(`https://api.cloudflare.com/client/v4/accounts/YOURACCOUNT/storage/kv/namespaces/${namespace}/values/${key}`, {
    headers: cloudflareApiHeader,
    method: 'GET'
  })
  const response = await fetch(request)
  const responseBody = await response.text()

  if (response.status == 200) {
    console.log(`Getting key '${key}'`)
    return new Response(responseBody, { status: 200, headers:corsHeaders })
  } else {
    console.log(`Error getting key '${key}'`)
    return new Response(`Error getting key '${key}'`, { status: response.status, headers:corsHeaders })
  }
}

/**
 * Entry point of the worker
 */
async function handleRequest(event) {
  // Generate the CORS headers I'll have to return with requests
  const corsHeaders = setCorsHeaders(new Headers())

  try {
    const requestMethod = event.request.method
    const requestUrl = new URL(event.request.url)

    // Route requests for the static site to Azure blob storage
    if (requestUrl.hostname === 'kvexplorer.YOURURL.com') {    
      const dst = new URL('https://YOURURL.z26.web.core.windows.net/')
      dst.pathname += requestUrl.pathname

      let blobResponse = await fetch(dst, event.request)
      return blobResponse
    }
   
    // Always return the same CORS info
    if (requestMethod === 'OPTIONS') {
      return new Response('', { headers:corsHeaders })
    }

    // Get all the namespaces
    console.log(event.request)
    console.log(requestUrl)
    if (requestMethod === 'GET' && requestUrl.hostname === apiHostname && requestUrl.pathname === '/v1/namespaces') {
      return getNamespaces(corsHeaders)
    }

    // Get a page of keys
    if (requestMethod === 'GET' && requestUrl.hostname === apiHostname && requestUrl.pathname.startsWith('/v1/keys')) {
      return getKeys(requestUrl, corsHeaders)
    }

    // Get a specific key
    if (requestMethod === 'GET' && requestUrl.hostname === apiHostname && requestUrl.pathname.startsWith('/v1/key')) {
      return getKeyValue(requestUrl, corsHeaders)
    }
    
    const response = await fetch(event.request)
    return response
  }
  catch (err) {
    return new Response(err.stack, { status: 500, headers:corsHeaders })
  }
}
