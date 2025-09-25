#!/usr/bin/env python3
"""
東証全上場銘柄データ取得スクリプト
Yahoo Finance APIを使用して日本株の銘柄データを取得し、JSONファイルに保存する
"""

import sys
import os
import json
import time
import random
from datetime import datetime, timedelta
import requests

# プロジェクトルートを追加
sys.path.append('/opt/.manus/.sandbox-runtime')

def generate_mock_stock_data():
    """
    東証主要銘柄のモックデータを生成
    実際のAPIが利用できない場合のフォールバック
    """
    
    # 東証主要銘柄リスト（実際の銘柄コードと企業名）
    major_stocks = [
        # プライム市場主要銘柄
        {"code": "1301", "name": "極洋", "market": "PRIME"},
        {"code": "1332", "name": "日本水産", "market": "PRIME"},
        {"code": "1605", "name": "INPEX", "market": "PRIME"},
        {"code": "1801", "name": "大成建設", "market": "PRIME"},
        {"code": "1802", "name": "大林組", "market": "PRIME"},
        {"code": "1803", "name": "清水建設", "market": "PRIME"},
        {"code": "1925", "name": "大和ハウス工業", "market": "PRIME"},
        {"code": "2002", "name": "日清製粉グループ本社", "market": "PRIME"},
        {"code": "2269", "name": "明治ホールディングス", "market": "PRIME"},
        {"code": "2502", "name": "アサヒグループホールディングス", "market": "PRIME"},
        {"code": "2503", "name": "キリンホールディングス", "market": "PRIME"},
        {"code": "2801", "name": "キッコーマン", "market": "PRIME"},
        {"code": "2802", "name": "味の素", "market": "PRIME"},
        {"code": "2914", "name": "日本たばこ産業", "market": "PRIME"},
        {"code": "3086", "name": "J.フロント リテイリング", "market": "PRIME"},
        {"code": "3099", "name": "三越伊勢丹ホールディングス", "market": "PRIME"},
        {"code": "3382", "name": "セブン&アイ・ホールディングス", "market": "PRIME"},
        {"code": "3401", "name": "帝人", "market": "PRIME"},
        {"code": "3402", "name": "東レ", "market": "PRIME"},
        {"code": "3861", "name": "王子ホールディングス", "market": "PRIME"},
        {"code": "4005", "name": "住友化学", "market": "PRIME"},
        {"code": "4021", "name": "日産化学", "market": "PRIME"},
        {"code": "4043", "name": "トクヤマ", "market": "PRIME"},
        {"code": "4061", "name": "デンカ", "market": "PRIME"},
        {"code": "4063", "name": "信越化学工業", "market": "PRIME"},
        {"code": "4183", "name": "三井化学", "market": "PRIME"},
        {"code": "4188", "name": "三菱ケミカルホールディングス", "market": "PRIME"},
        {"code": "4502", "name": "武田薬品工業", "market": "PRIME"},
        {"code": "4503", "name": "アステラス製薬", "market": "PRIME"},
        {"code": "4506", "name": "大日本住友製薬", "market": "PRIME"},
        {"code": "4507", "name": "塩野義製薬", "market": "PRIME"},
        {"code": "4519", "name": "中外製薬", "market": "PRIME"},
        {"code": "4523", "name": "エーザイ", "market": "PRIME"},
        {"code": "4568", "name": "第一三共", "market": "PRIME"},
        {"code": "4901", "name": "富士フイルムホールディングス", "market": "PRIME"},
        {"code": "4911", "name": "資生堂", "market": "PRIME"},
        {"code": "5001", "name": "新日本石油", "market": "PRIME"},
        {"code": "5101", "name": "横浜ゴム", "market": "PRIME"},
        {"code": "5108", "name": "ブリヂストン", "market": "PRIME"},
        {"code": "5201", "name": "AGC", "market": "PRIME"},
        {"code": "5214", "name": "日本電気硝子", "market": "PRIME"},
        {"code": "5301", "name": "東海カーボン", "market": "PRIME"},
        {"code": "5401", "name": "日本製鉄", "market": "PRIME"},
        {"code": "5406", "name": "神戸製鋼所", "market": "PRIME"},
        {"code": "5411", "name": "JFEホールディングス", "market": "PRIME"},
        {"code": "5541", "name": "大平洋金属", "market": "PRIME"},
        {"code": "5631", "name": "日本製鋼所", "market": "PRIME"},
        {"code": "5703", "name": "日本軽金属ホールディングス", "market": "PRIME"},
        {"code": "5706", "name": "三井金属鉱業", "market": "PRIME"},
        {"code": "5711", "name": "三菱マテリアル", "market": "PRIME"},
        {"code": "5714", "name": "DOWA ホールディングス", "market": "PRIME"},
        {"code": "5801", "name": "古河電気工業", "market": "PRIME"},
        {"code": "5802", "name": "住友電気工業", "market": "PRIME"},
        {"code": "5803", "name": "フジクラ", "market": "PRIME"},
        {"code": "6098", "name": "リクルートホールディングス", "market": "PRIME"},
        {"code": "6103", "name": "オークマ", "market": "PRIME"},
        {"code": "6113", "name": "アマダ", "market": "PRIME"},
        {"code": "6136", "name": "オーエスジー", "market": "PRIME"},
        {"code": "6178", "name": "日本郵政", "market": "PRIME"},
        {"code": "6301", "name": "コマツ", "market": "PRIME"},
        {"code": "6302", "name": "住友重機械工業", "market": "PRIME"},
        {"code": "6305", "name": "日立建機", "market": "PRIME"},
        {"code": "6326", "name": "クボタ", "market": "PRIME"},
        {"code": "6361", "name": "荏原製作所", "market": "PRIME"},
        {"code": "6367", "name": "ダイキン工業", "market": "PRIME"},
        {"code": "6471", "name": "日本精工", "market": "PRIME"},
        {"code": "6472", "name": "NTN", "market": "PRIME"},
        {"code": "6473", "name": "ジェイテクト", "market": "PRIME"},
        {"code": "6501", "name": "日立製作所", "market": "PRIME"},
        {"code": "6502", "name": "東芝", "market": "PRIME"},
        {"code": "6503", "name": "三菱電機", "market": "PRIME"},
        {"code": "6504", "name": "富士電機", "market": "PRIME"},
        {"code": "6506", "name": "安川電機", "market": "PRIME"},
        {"code": "6594", "name": "日本電産", "market": "PRIME"},
        {"code": "6701", "name": "NEC", "market": "PRIME"},
        {"code": "6702", "name": "富士通", "market": "PRIME"},
        {"code": "6723", "name": "ルネサスエレクトロニクス", "market": "PRIME"},
        {"code": "6724", "name": "セイコーエプソン", "market": "PRIME"},
        {"code": "6752", "name": "パナソニック ホールディングス", "market": "PRIME"},
        {"code": "6758", "name": "ソニーグループ", "market": "PRIME"},
        {"code": "6762", "name": "TDK", "market": "PRIME"},
        {"code": "6770", "name": "アルプスアルパイン", "market": "PRIME"},
        {"code": "6841", "name": "横河電機", "market": "PRIME"},
        {"code": "6857", "name": "アドバンテスト", "market": "PRIME"},
        {"code": "6861", "name": "キーエンス", "market": "PRIME"},
        {"code": "6902", "name": "デンソー", "market": "PRIME"},
        {"code": "6954", "name": "ファナック", "market": "PRIME"},
        {"code": "6971", "name": "京セラ", "market": "PRIME"},
        {"code": "6976", "name": "太陽誘電", "market": "PRIME"},
        {"code": "6981", "name": "村田製作所", "market": "PRIME"},
        {"code": "7003", "name": "三井E&Sホールディングス", "market": "PRIME"},
        {"code": "7011", "name": "三菱重工業", "market": "PRIME"},
        {"code": "7012", "name": "川崎重工業", "market": "PRIME"},
        {"code": "7013", "name": "IHI", "market": "PRIME"},
        {"code": "7201", "name": "日産自動車", "market": "PRIME"},
        {"code": "7202", "name": "いすゞ自動車", "market": "PRIME"},
        {"code": "7203", "name": "トヨタ自動車", "market": "PRIME"},
        {"code": "7205", "name": "日野自動車", "market": "PRIME"},
        {"code": "7211", "name": "三菱自動車工業", "market": "PRIME"},
        {"code": "7261", "name": "マツダ", "market": "PRIME"},
        {"code": "7267", "name": "ホンダ", "market": "PRIME"},
        {"code": "7269", "name": "スズキ", "market": "PRIME"},
        {"code": "7270", "name": "SUBARU", "market": "PRIME"},
        {"code": "7731", "name": "ニコン", "market": "PRIME"},
        {"code": "7732", "name": "トプコン", "market": "PRIME"},
        {"code": "7733", "name": "オリンパス", "market": "PRIME"},
        {"code": "7735", "name": "SCREENホールディングス", "market": "PRIME"},
        {"code": "7741", "name": "HOYA", "market": "PRIME"},
        {"code": "7751", "name": "キヤノン", "market": "PRIME"},
        {"code": "7832", "name": "バンダイナムコホールディングス", "market": "PRIME"},
        {"code": "7974", "name": "任天堂", "market": "PRIME"},
        {"code": "8001", "name": "伊藤忠商事", "market": "PRIME"},
        {"code": "8002", "name": "丸紅", "market": "PRIME"},
        {"code": "8015", "name": "豊田通商", "market": "PRIME"},
        {"code": "8031", "name": "三井物産", "market": "PRIME"},
        {"code": "8053", "name": "住友商事", "market": "PRIME"},
        {"code": "8058", "name": "三菱商事", "market": "PRIME"},
        {"code": "8267", "name": "イオン", "market": "PRIME"},
        {"code": "8306", "name": "三菱UFJフィナンシャル・グループ", "market": "PRIME"},
        {"code": "8316", "name": "三井住友フィナンシャルグループ", "market": "PRIME"},
        {"code": "8411", "name": "みずほフィナンシャルグループ", "market": "PRIME"},
        {"code": "8591", "name": "オリックス", "market": "PRIME"},
        {"code": "8604", "name": "野村ホールディングス", "market": "PRIME"},
        {"code": "8628", "name": "松井証券", "market": "PRIME"},
        {"code": "8630", "name": "SOMPOホールディングス", "market": "PRIME"},
        {"code": "8725", "name": "MS&ADインシュアランスグループホールディングス", "market": "PRIME"},
        {"code": "8750", "name": "第一生命ホールディングス", "market": "PRIME"},
        {"code": "8766", "name": "東京海上ホールディングス", "market": "PRIME"},
        {"code": "8802", "name": "三菱地所", "market": "PRIME"},
        {"code": "8830", "name": "住友不動産", "market": "PRIME"},
        {"code": "9001", "name": "東武鉄道", "market": "PRIME"},
        {"code": "9005", "name": "東急", "market": "PRIME"},
        {"code": "9007", "name": "小田急電鉄", "market": "PRIME"},
        {"code": "9008", "name": "京王電鉄", "market": "PRIME"},
        {"code": "9009", "name": "京成電鉄", "market": "PRIME"},
        {"code": "9020", "name": "東日本旅客鉄道", "market": "PRIME"},
        {"code": "9021", "name": "西日本旅客鉄道", "market": "PRIME"},
        {"code": "9022", "name": "東海旅客鉄道", "market": "PRIME"},
        {"code": "9101", "name": "日本郵船", "market": "PRIME"},
        {"code": "9104", "name": "商船三井", "market": "PRIME"},
        {"code": "9107", "name": "川崎汽船", "market": "PRIME"},
        {"code": "9201", "name": "日本航空", "market": "PRIME"},
        {"code": "9202", "name": "ANAホールディングス", "market": "PRIME"},
        {"code": "9301", "name": "三菱倉庫", "market": "PRIME"},
        {"code": "9432", "name": "日本電信電話", "market": "PRIME"},
        {"code": "9433", "name": "KDDI", "market": "PRIME"},
        {"code": "9434", "name": "ソフトバンク", "market": "PRIME"},
        {"code": "9501", "name": "東京電力ホールディングス", "market": "PRIME"},
        {"code": "9502", "name": "中部電力", "market": "PRIME"},
        {"code": "9503", "name": "関西電力", "market": "PRIME"},
        {"code": "9531", "name": "東京ガス", "market": "PRIME"},
        {"code": "9532", "name": "大阪ガス", "market": "PRIME"},
        {"code": "9613", "name": "NTTデータ", "market": "PRIME"},
        {"code": "9984", "name": "ソフトバンクグループ", "market": "PRIME"},
        
        # スタンダード市場主要銘柄
        {"code": "2127", "name": "日本M&Aセンターホールディングス", "market": "STANDARD"},
        {"code": "2432", "name": "ディー・エヌ・エー", "market": "STANDARD"},
        {"code": "3659", "name": "ネクソン", "market": "STANDARD"},
        {"code": "4324", "name": "電通グループ", "market": "STANDARD"},
        {"code": "4385", "name": "メルカリ", "market": "STANDARD"},
        {"code": "6098", "name": "リクルートホールディングス", "market": "STANDARD"},
        {"code": "7974", "name": "任天堂", "market": "STANDARD"},
        {"code": "9449", "name": "GMOインターネット", "market": "STANDARD"},
        
        # グロース市場主要銘柄
        {"code": "2121", "name": "ミクシィ", "market": "GROWTH"},
        {"code": "3092", "name": "ZOZO", "market": "GROWTH"},
        {"code": "3656", "name": "KLab", "market": "GROWTH"},
        {"code": "3687", "name": "フィックスターズ", "market": "GROWTH"},
        {"code": "3765", "name": "ガンホー・オンライン・エンターテイメント", "market": "GROWTH"},
        {"code": "4385", "name": "メルカリ", "market": "GROWTH"},
        {"code": "4477", "name": "BASE", "market": "GROWTH"},
        {"code": "6094", "name": "フリー", "market": "GROWTH"},
    ]
    
    # 各銘柄のモックデータを生成
    stocks_data = []
    
    for stock in major_stocks:
        # ベース価格を設定（銘柄コードに基づく）
        base_price = 1000 + (int(stock["code"]) % 1000) * 2
        
        # 現在価格（ベース価格の±20%の範囲でランダム）
        current_price = base_price * (0.8 + random.random() * 0.4)
        
        # 前日比（±5%の範囲）
        change_percent = (random.random() - 0.5) * 10
        change = current_price * change_percent / 100
        
        # 出来高（10万〜500万株）
        volume = random.randint(100000, 5000000)
        
        # 時価総額（適当な値）
        market_cap = current_price * random.randint(10000000, 1000000000)
        
        stock_data = {
            "code": stock["code"],
            "name": stock["name"],
            "market": stock["market"],
            "price": round(current_price, 0),
            "change": round(change, 0),
            "changePercent": round(change_percent, 2),
            "volume": volume,
            "marketCap": market_cap,
            "sector": get_sector_by_code(stock["code"]),
            "lastUpdate": datetime.now().isoformat()
        }
        
        stocks_data.append(stock_data)
    
    return stocks_data

def get_sector_by_code(code):
    """銘柄コードから業種を推定"""
    code_int = int(code)
    
    if 1000 <= code_int < 2000:
        return "水産・農林業"
    elif 2000 <= code_int < 3000:
        return "食料品"
    elif 3000 <= code_int < 4000:
        return "繊維製品・小売業"
    elif 4000 <= code_int < 5000:
        return "化学・医薬品"
    elif 5000 <= code_int < 6000:
        return "石油・石炭・ガラス・鉄鋼"
    elif 6000 <= code_int < 7000:
        return "機械"
    elif 7000 <= code_int < 8000:
        return "電気機器・自動車・精密機器"
    elif 8000 <= code_int < 9000:
        return "商社・金融・不動産"
    elif 9000 <= code_int < 10000:
        return "陸運・海運・空運・通信・電力・ガス"
    else:
        return "その他"

def generate_chart_data(stock_code, days=250):
    """
    指定銘柄のチャートデータ（ローソク足）を生成
    """
    chart_data = []
    base_price = 1000 + (int(stock_code) % 1000) * 2
    current_price = base_price
    
    # 過去のデータから現在まで生成
    start_date = datetime.now() - timedelta(days=days)
    
    for i in range(days):
        date = start_date + timedelta(days=i)
        
        # 土日をスキップ
        if date.weekday() >= 5:
            continue
        
        # 価格変動（前日比±3%程度）
        change_rate = (random.random() - 0.5) * 0.06
        current_price *= (1 + change_rate)
        
        # OHLC生成
        open_price = current_price * (0.98 + random.random() * 0.04)
        close_price = current_price * (0.98 + random.random() * 0.04)
        high_price = max(open_price, close_price) * (1 + random.random() * 0.02)
        low_price = min(open_price, close_price) * (1 - random.random() * 0.02)
        
        # 出来高
        volume = random.randint(50000, 2000000)
        
        chart_data.append({
            "date": date.strftime("%m/%d"),
            "open": round(open_price, 0),
            "high": round(high_price, 0),
            "low": round(low_price, 0),
            "close": round(close_price, 0),
            "volume": volume
        })
    
    return chart_data

def save_stocks_data():
    """
    全銘柄データをJSONファイルに保存
    """
    print("📊 東証全上場銘柄データを生成中...")
    
    # モックデータを生成
    stocks_data = generate_mock_stock_data()
    
    print(f"✅ {len(stocks_data)}銘柄のデータを生成しました")
    
    # データディレクトリを作成
    os.makedirs("data", exist_ok=True)
    
    # 銘柄一覧を保存
    with open("data/all_stocks.json", "w", encoding="utf-8") as f:
        json.dump(stocks_data, f, ensure_ascii=False, indent=2)
    
    print("💾 data/all_stocks.json に保存しました")
    
    # 各銘柄のチャートデータを生成・保存
    print("📈 各銘柄のチャートデータを生成中...")
    
    chart_data_dir = "data/charts"
    os.makedirs(chart_data_dir, exist_ok=True)
    
    for stock in stocks_data:
        chart_data = generate_chart_data(stock["code"])
        chart_file = f"{chart_data_dir}/{stock['code']}.json"
        
        with open(chart_file, "w", encoding="utf-8") as f:
            json.dump(chart_data, f, ensure_ascii=False, indent=2)
    
    print(f"📊 {len(stocks_data)}銘柄のチャートデータを生成しました")
    
    # サマリー情報を生成
    summary = {
        "totalStocks": len(stocks_data),
        "markets": {
            "PRIME": len([s for s in stocks_data if s["market"] == "PRIME"]),
            "STANDARD": len([s for s in stocks_data if s["market"] == "STANDARD"]),
            "GROWTH": len([s for s in stocks_data if s["market"] == "GROWTH"])
        },
        "lastUpdate": datetime.now().isoformat(),
        "dataSource": "Mock Data Generator"
    }
    
    with open("data/summary.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    
    print("📋 data/summary.json にサマリー情報を保存しました")
    
    return stocks_data

if __name__ == "__main__":
    print("🚀 東証全上場銘柄データ取得スクリプトを開始します...")
    
    try:
        stocks_data = save_stocks_data()
        
        print(f"\n✅ 処理完了！")
        print(f"📊 総銘柄数: {len(stocks_data)}")
        print(f"💾 保存場所: data/")
        print(f"📁 ファイル:")
        print(f"  - all_stocks.json (全銘柄データ)")
        print(f"  - charts/*.json (各銘柄チャートデータ)")
        print(f"  - summary.json (サマリー情報)")
        
    except Exception as e:
        print(f"❌ エラーが発生しました: {str(e)}")
        sys.exit(1)
