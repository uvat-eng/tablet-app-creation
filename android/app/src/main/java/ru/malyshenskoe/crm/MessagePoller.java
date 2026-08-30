package ru.malyshenskoe.crm;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

public class MessagePoller {

    public static final String PREFS = "hb_push";
    public static final String KEY_TOKEN = "auth_token";
    public static final String KEY_CLUB = "club_allowed";
    private static final String KEY_SEEN = "seen_total";

    private static final String CHAT_URL =
            "https://functions.poehali.dev/8210ebe4-f4da-43d9-9ddf-469fd4251d58?action=unread";
    private static final String CLUB_URL =
            "https://functions.poehali.dev/225961f2-6b49-4c2d-90b4-0ed65700f726?action=unread";

    public static class Result {
        public int personal;
        public int club;
        public int total;
        public int fresh;
    }

    private static int fetchUnread(String url, String token) {
        HttpURLConnection conn = null;
        try {
            conn = (HttpURLConnection) new URL(url).openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("X-Auth-Token", token);
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(15000);
            if (conn.getResponseCode() != 200) return 0;

            BufferedReader r = new BufferedReader(new InputStreamReader(conn.getInputStream()));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = r.readLine()) != null) sb.append(line);
            r.close();

            JSONObject json = new JSONObject(sb.toString());
            return json.optInt("unread", 0);
        } catch (Exception e) {
            return -1;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    public static Result check(Context ctx) {
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String token = p.getString(KEY_TOKEN, "");
        Result res = new Result();
        if (token == null || token.isEmpty()) return res;

        int personal = fetchUnread(CHAT_URL, token);
        int club = p.getBoolean(KEY_CLUB, false) ? fetchUnread(CLUB_URL, token) : 0;

        if (personal < 0 && club < 0) return res;
        if (personal < 0) personal = 0;
        if (club < 0) club = 0;

        res.personal = personal;
        res.club = club;
        res.total = personal + club;

        int seen = p.getInt(KEY_SEEN, 0);
        res.fresh = res.total > seen ? res.total - seen : 0;
        p.edit().putInt(KEY_SEEN, res.total).apply();

        return res;
    }

    public static void resetSeen(Context ctx, int total) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit().putInt(KEY_SEEN, total).apply();
    }
}
