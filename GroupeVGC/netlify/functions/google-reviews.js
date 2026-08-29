const GOOGLE_REVIEWS_FALLBACK_URL = 'https://www.google.com/search?q=Reliable+Brothers+Moving+Montréal+reviews';

function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

function ratingNumber(value) {
  const map = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
  return map[String(value || '').toUpperCase()] || 0;
}

async function getAccessToken() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    const err = new Error(data.error_description || data.error || `Google OAuth token request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data.access_token;
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' }, { Allow: 'GET' });

  const accountId = process.env.GOOGLE_BUSINESS_ACCOUNT_ID;
  const locationId = process.env.GOOGLE_BUSINESS_LOCATION_ID;
  const reviewsUrl = process.env.GOOGLE_REVIEWS_URL || GOOGLE_REVIEWS_FALLBACK_URL;

  if (!accountId || !locationId || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
    return json(200, {
      configured: false,
      source: 'google-business-profile',
      reviewsUrl,
      message: 'Google Business Profile authorization is pending.',
    });
  }

  try {
    const accessToken = await getAccessToken();
    const parent = `accounts/${accountId}/locations/${locationId}`;
    const url = new URL(`https://mybusiness.googleapis.com/v4/${parent}/reviews`);
    url.searchParams.set('pageSize', '50');
    url.searchParams.set('orderBy', 'updateTime desc');

    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = data?.error?.message || `Google Reviews request failed (${res.status})`;
      const err = new Error(message);
      err.status = res.status;
      throw err;
    }

    const reviews = (data.reviews || []).map((r) => ({
      id: r.reviewId || r.name || '',
      author: r.reviewer?.isAnonymous ? 'Google Customer' : (r.reviewer?.displayName || 'Google Customer'),
      profilePhotoUrl: r.reviewer?.isAnonymous ? '' : (r.reviewer?.profilePhotoUrl || ''),
      rating: ratingNumber(r.starRating),
      text: r.comment || '',
      createTime: r.createTime || '',
      updateTime: r.updateTime || '',
      source: 'Google',
    }));

    return json(200, {
      configured: true,
      source: 'google-business-profile',
      averageRating: Number(data.averageRating || 0),
      totalReviewCount: Number(data.totalReviewCount || reviews.length),
      reviewsUrl,
      reviews,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('google-reviews', error);
    return json(502, {
      configured: true,
      source: 'google-business-profile',
      reviewsUrl,
      error: 'Google reviews are temporarily unavailable.',
    });
  }
};
