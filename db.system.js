db.system.js.save({
    _id: "parseRaw60",
    value : function(market) {
        
        var m = db.Market.findOne({"market":market});
        if (!m) {
            print("no market match: " + market);
            return;
        }
        
        // ��ѯ�г�
        db.Raw60.find({"market":market, "status":0, "code":"AAPL"}).forEach(function(raw){
            var error = false, message = "", json = {};
            try {
                // ����json
                json = db.eval(raw.json);
            } catch(e) {
                error = true;
                message = e.toString();
            }

            //  parse�쳣
            if (error) {
                // ����
                raw.status = 1;
                raw.message = message;
                db.Raw60.save(raw);
                return;
            }

            // json����쳣
            if (json.chart.error) {
                // ����
                raw.status = 2;
                raw.message = "code:" + json.chart.error.code + "  description" + json.chart.error.description;
                db.Raw60.save(raw);
                return;
            }

            //  json�ṹ
            if (json.chart.result[0] == null ||
                json.chart.result[0].timestamp == null) {                
                // ����
                raw.status = 3;
                db.Raw60.save(raw);
                return;
            }
            
            if (json.chart.result[0].timestamp == null ||
                json.chart.result[0].meta.tradingPeriods.regular == null) {                
                // ����
                raw.status = 3;
                db.Raw60.save(raw);
                return;
            }

            var timestamp = json.chart.result[0].timestamp, 
                quote = json.chart.result[0].indicators.quote[0],
                tradingPeriods = json.chart.result[0].meta.tradingPeriods,
                pres = [], regulars = [], posts = [];

            for (var index = 0; index < timestamp.length; index++) {
                var p = {
                    "market": raw.market,
                    "code": raw.code,
                    "start": new Date((timestamp[index]+m.gmtoffset)*1000),
                    "end": new Date((timestamp[index]+m.gmtoffset)*1000 + 60*1000),
                    "open": quote.open[index],
                    "close": quote.close[index],
                    "high": quote.high[index],
                    "low": quote.low[index],
                    "volume": quote.volume[index]
                };

                if (timestamp[index] >= tradingPeriods.pre[0][0].start && timestamp[index] < tradingPeriods.pre[0][0].end) {
                    pres.push(p);
                } else if (timestamp[index] >= tradingPeriods.regular[0][0].start && timestamp[index] < tradingPeriods.regular[0][0].end) {
                    regulars.push(p);
                } else if (timestamp[index] >= tradingPeriods.post[0][0].start && timestamp[index] < tradingPeriods.post[0][0].end) {
                    posts.push(p);
                }
            }

            if (pres.length > 0) {
                db.Pre60.insert(pres);
            }

            if (regulars.length > 0) {
                db.Regular60.insert(regulars);
            }

            if (posts.length > 0) {
                db.Post60.insert(posts);
            }

            // ����
            raw.status = 9;
            db.Raw60.save(raw);
            return;
        });
        return;
    }
});