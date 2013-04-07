#!/usr/bin/env python

import base64

#import numpy as np

from OceanSound.extract import extract_series
from OceanSound.sounds import get_music

from flask import Flask, render_template, request, json, Response

app = Flask(__name__)


def replace_nan(value):
    """
    Replace NaN with None, for JSON encoding.

    """
    if isinstance(value, list):
        return map(replace_nan, value)
    elif value != value:
        return None
    else:
        return value


def gen_music(lat, lon):
    data_am = extract_series(lat, lon, "/home/luizirber/temp/MODIS_Chla_9km")
    am = get_music(data_am['Series'])

    return am, data_am['Series'], data_am['Lat'], data_am['Lon']


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/music')
def music():
    if request.method == 'GET':
        lat = float(request.args['lat'])
        lon = float(request.args['lon'])
        music, series, new_lat, new_lon = gen_music(lat, lon)
        return json.dumps({
             'lat': new_lat,
             'lon': new_lon,
             'series': replace_nan(series.tolist()),
             'music': base64.b64encode(music.getvalue()),
             }, allow_nan=False)
    else:
        return Response("", status=415)


def main():
    app.run(debug=True, host='0.0.0.0')


if __name__ == '__main__':
    main()
