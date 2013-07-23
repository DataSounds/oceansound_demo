#!/usr/bin/env python

import base64

import numpy as np

from OceanSound.extract import extract_series
from DataSounds.sounds import get_music

from flask import Flask, render_template, request, json, Response, current_app

app = Flask(__name__)
app.config.from_object('settings')
app.config.from_envvar('OCDEMO_CONFIG', silent=True)


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


def gen_music(lat, lon, datadir):
    data_am = extract_series(lat, lon, datadir)
    am = get_music(data_am['Series'])

    return am, data_am['Series'], data_am['Lat'], data_am['Lon']


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/music')
def music():
    if request.method == 'GET':
        mode = request.args.get('mode', 'MODIS')

        if mode == 'MODIS':
            lat = float(request.args['lat'])
            lon = float(request.args['lon'])
            music, series, new_lat, new_lon = (
                gen_music(lat, lon, current_app.config['DATADIR']))
            return json.dumps({
                              'lat': new_lat,
                              'lon': new_lon,
                              'series': replace_nan(series.tolist()),
                              'music': base64.b64encode(music.getvalue()),
                              }, allow_nan=False)
        elif mode == 'series':
            series = np.array(request.args.getlist('series[]'), dtype='f8')
            return json.dumps({
                'series': replace_nan(series.tolist()),
                'music': base64.b64encode(get_music(series).getvalue())
            }, allow_nan=False)
    else:
        return Response("", status=415)


def main():
    app.run(debug=True)  # , host='0.0.0.0')


if __name__ == '__main__':
    main()
